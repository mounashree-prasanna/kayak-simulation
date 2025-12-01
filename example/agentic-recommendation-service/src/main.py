from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os
import asyncio
import json
from contextlib import asynccontextmanager

from src.database_sqlite import init_db as init_sqlite
from src.database_mongodb import get_database, close_database
from src.config.redis_config import get_redis, close_redis
from src.routes.bundles import router as bundles_router
from src.routes.deals import router as deals_router
from src.routes.intent import router as intent_router
from src.routes.watch import router as watch_router
from src.routes.ingest import router as ingest_router
from src.websocket_manager import ConnectionManager
from src.workers.websocket_relay import WebSocketRelay
from src.workers.cache_warmer import CacheWarmer
from src.services.watchlist_service import WatchlistService
from src.services.deals_agent import (
    NormalizationStage,
    DealDetector,
    OfferTagger
)

load_dotenv()

# Global managers
manager = ConnectionManager()
websocket_relay = None
cache_warmer = None
watchlist_service = WatchlistService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    # Startup
    try:
        init_sqlite()
        print("[Recommendation Service] SQLite initialized")
    except Exception as e:
        print(f"[Recommendation Service] SQLite init warning: {e}")
    
    try:
        await get_redis()
        print("[Recommendation Service] Redis connected")
    except Exception as e:
        print(f"[Recommendation Service] Redis connection warning: {e}")
    
    try:
        await get_database()
        print("[Recommendation Service] MongoDB connected")
    except Exception as e:
        print(f"[Recommendation Service] MongoDB connection warning: {e}")
    
    print("[Recommendation Service] Databases initialized")
    
    # Start background workers (non-blocking, handle errors gracefully)
    global websocket_relay, cache_warmer
    websocket_relay = WebSocketRelay(manager)
    cache_warmer = CacheWarmer()
    watchlist_service.set_websocket_manager(manager)
    
    # Start workers in background with error handling (non-blocking)
    async def start_worker(worker_func, worker_name):
        """Start a worker with error handling"""
        try:
            await worker_func()
        except Exception as e:
            print(f"[Recommendation Service] {worker_name} error: {e}")
            print(f"[Recommendation Service] Continuing without {worker_name}")
    
    # Start Deals Agent pipeline stages
    try:
        normalization = NormalizationStage()
        deal_detector = DealDetector()
        offer_tagger = OfferTagger()
        
        # Start Deals Agent stages (initialize first, then process)
        async def start_deals_pipeline():
            """Start the complete deals pipeline"""
            try:
                print("[Deals Agent] Initializing pipeline stages...")
                await normalization.start()
                print("[Deals Agent] Normalization stage started")
                await deal_detector.start()
                print("[Deals Agent] Deal Detector stage started")
                await offer_tagger.start()
                print("[Deals Agent] Offer Tagger stage started")
                print("[Deals Agent] All stages initialized, starting processing loops...")
                
                # Start processing loops in parallel (these run indefinitely)
                await asyncio.gather(
                    normalization.process(),
                    deal_detector.process(),
                    offer_tagger.process(),
                    return_exceptions=True
                )
            except Exception as e:
                print(f"[Deals Agent] Pipeline error: {e}")
                import traceback
                traceback.print_exc()
        
        asyncio.create_task(start_deals_pipeline())
        print("[Deals Agent] Pipeline startup task created")
    except Exception as e:
        print(f"[Deals Agent] Failed to start pipeline: {e}")
        import traceback
        traceback.print_exc()
    
    # Start other workers as background tasks (non-blocking)
    asyncio.create_task(start_worker(websocket_relay.start, "WebSocket relay"))
    asyncio.create_task(start_worker(cache_warmer.start, "Cache warmer"))
    asyncio.create_task(start_worker(watchlist_service.start_monitoring, "Watchlist monitor"))
    
    print("[Recommendation Service] Background workers started (non-blocking)")
    
    yield
    
    # Shutdown - close in reverse order
    print("[Recommendation Service] Starting shutdown...")
    
    try:
        if websocket_relay:
            await websocket_relay.stop()
    except Exception as e:
        print(f"[Recommendation Service] WebSocket relay shutdown error: {e}")
    
    try:
        if cache_warmer:
            cache_warmer.stop()
    except Exception as e:
        print(f"[Recommendation Service] Cache warmer shutdown error: {e}")
    
    # Close database connections before Redis
    try:
        await close_database()
        print("[Recommendation Service] MongoDB closed")
    except Exception as e:
        print(f"[Recommendation Service] MongoDB close error: {e}")
    
    try:
        await close_redis()
        print("[Recommendation Service] Redis closed")
    except Exception as e:
        print(f"[Recommendation Service] Redis close error: {e}")
    
    # Small delay to allow threads to finish
    await asyncio.sleep(0.1)
    
    print("[Recommendation Service] Shutdown complete")

app = FastAPI(
    title="Agentic Recommendation Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(intent_router, prefix="/intent", tags=["intent"])
app.include_router(bundles_router, prefix="/bundles", tags=["bundles"])
app.include_router(watch_router, prefix="/watch", tags=["watch"])
app.include_router(deals_router, prefix="/deals", tags=["deals"])
app.include_router(ingest_router, prefix="/api/ingest", tags=["ingest"])

@app.get("/health")
async def health():
    return {
        "success": True,
        "message": "Agentic Recommendation Service is running",
        "service": "recommendation"
    }

@app.websocket("/events")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query(None)
):
    """WebSocket endpoint for real-time deal updates"""
    await manager.connect(websocket, user_id)
    try:
        # Subscribe to deal.events by default
        await manager.subscribe(websocket, ["deal.events"])
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "subscribe":
                await manager.subscribe(websocket, message.get("topics", []))
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)


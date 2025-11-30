from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os
from typing import List, Dict
import json

from src.database import init_db
from src.routes.bundles import router as bundles_router
from src.routes.deals import router as deals_router
from src.websocket_manager import ConnectionManager
from src.kafka_consumer import KafkaConsumerService

load_dotenv()

app = FastAPI(title="Agentic Recommendation Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(bundles_router, prefix="/bundles", tags=["bundles"])
app.include_router(deals_router, prefix="/deals", tags=["deals"])

# WebSocket manager
manager = ConnectionManager()

# Kafka consumer service (for WebSocket bridge)
kafka_consumer_service = None

# Initialize database and Kafka consumer
@app.on_event("startup")
async def startup_event():
    global kafka_consumer_service
    
    # Initialize database
    await init_db()
    print("[Recommendation Service] Database initialized")
    
    # Initialize Kafka consumer for WebSocket bridge
    try:
        kafka_consumer_service = KafkaConsumerService(manager)
        await kafka_consumer_service.start()
        print("[Recommendation Service] Kafka consumer started for WebSocket bridge")
    except Exception as e:
        print(f"[Recommendation Service] Warning: Could not start Kafka consumer: {str(e)}")
        print("[Recommendation Service] Service will continue without Kafka bridge")
        kafka_consumer_service = None

@app.get("/health")
async def health():
    kafka_status = "connected" if kafka_consumer_service and kafka_consumer_service.is_running else "disconnected"
    return {
        "success": True,
        "message": "Agentic Recommendation Service is running",
        "service": "recommendation",
        "kafka_bridge": kafka_status
    }

@app.websocket("/events")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
            message = json.loads(data)
            if message.get("type") == "subscribe":
                topics = message.get("topics", [])
                await manager.subscribe(websocket, topics)
                print(f"[Recommendation Service] WebSocket client subscribed to topics: {topics}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("[Recommendation Service] WebSocket client disconnected")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global kafka_consumer_service
    if kafka_consumer_service:
        await kafka_consumer_service.stop()
        print("[Recommendation Service] Kafka consumer stopped")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


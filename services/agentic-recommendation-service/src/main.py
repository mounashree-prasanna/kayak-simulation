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

# Initialize database
@app.on_event("startup")
async def startup_event():
    await init_db()
    print("[Recommendation Service] Database initialized")

# Routes
app.include_router(bundles_router, prefix="/bundles", tags=["bundles"])
app.include_router(deals_router, prefix="/deals", tags=["deals"])

# WebSocket manager
manager = ConnectionManager()

@app.get("/health")
async def health():
    return {
        "success": True,
        "message": "Agentic Recommendation Service is running",
        "service": "recommendation"
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
                await manager.subscribe(websocket, message.get("topics", []))
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


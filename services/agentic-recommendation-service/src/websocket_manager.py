from fastapi import WebSocket
from typing import List, Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
    
    async def subscribe(self, websocket: WebSocket, topics: List[str]):
        if websocket in self.subscriptions:
            self.subscriptions[websocket].update(topics)
    
    async def broadcast(self, topic: str, message: dict):
        """Broadcast message to subscribers of a topic"""
        disconnected = []
        
        for websocket in self.active_connections:
            if topic in self.subscriptions.get(websocket, set()):
                try:
                    await websocket.send_json({
                        "topic": topic,
                        "data": message
                    })
                except:
                    disconnected.append(websocket)
        
        # Clean up disconnected clients
        for ws in disconnected:
            self.disconnect(ws)


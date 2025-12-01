from fastapi import WebSocket
from typing import List, Dict, Set, Optional
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, Set[str]] = {}
        self.user_connections: Dict[str, List[WebSocket]] = {}  # user_id -> [websockets]
        self.websocket_users: Dict[WebSocket, str] = {}  # websocket -> user_id
    
    async def connect(self, websocket: WebSocket, user_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
            self.websocket_users[websocket] = user_id
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]
        
        # Remove from user connections
        user_id = self.websocket_users.get(websocket)
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        if websocket in self.websocket_users:
            del self.websocket_users[websocket]
    
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
    
    async def send_personal_message(self, user_id: str, message: dict):
        """Send message to specific user's WebSocket connections"""
        if user_id in self.user_connections:
            disconnected = []
            for websocket in self.user_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except:
                    disconnected.append(websocket)
            
            # Clean up disconnected
            for ws in disconnected:
                self.disconnect(ws)


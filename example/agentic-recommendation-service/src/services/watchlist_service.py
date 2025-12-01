"""
Watchlist Service: Monitor price/inventory changes and send alerts
"""
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from src.database_sqlite import get_session, Watchlist, ListingType
from src.database_mongodb import get_database
from src.config.kafka_config import TOPIC_DEAL_EVENTS
from aiokafka import AIOKafkaConsumer
import json

class WatchlistService:
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.ws_manager = None  # Will be set from main
    
    def set_websocket_manager(self, manager):
        """Set WebSocket manager for sending alerts"""
        self.ws_manager = manager
    
    async def start_monitoring(self):
        """Start monitoring deal.events for watchlist triggers"""
        from src.config.kafka_config import KAFKA_BOOTSTRAP_SERVERS
        
        try:
            self.consumer = AIOKafkaConsumer(
                TOPIC_DEAL_EVENTS,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="watchlist-monitor-group",
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                enable_auto_commit=True,
                consumer_timeout_ms=1000
            )
            await self.consumer.start()
            print("[Watchlist] Started monitoring deal events")
            
            # Run in background without blocking
            while True:
                try:
                    msg_pack = await asyncio.wait_for(
                        self.consumer.getmany(timeout_ms=1000, max_records=10),
                        timeout=1.0
                    )
                    
                    for topic_partition, messages in msg_pack.items():
                        for message in messages:
                            event = message.value
                            await self.check_watchlist_triggers(event)
                            
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    print(f"[Watchlist] Monitoring error: {e}")
                    await asyncio.sleep(1)
                    
        except Exception as e:
            print(f"[Watchlist] Initialization error: {e}")
            print("[Watchlist] Continuing without Kafka monitoring")
            # Don't raise - allow service to continue
    
    async def check_watchlist_triggers(self, event: Dict[str, Any]):
        """Check if event triggers any watchlist items"""
        listing_id = event.get("listing_id")
        listing_type = event.get("listing_type")
        current_price = event.get("current_price")
        inventory = event.get("inventory")
        
        session = get_session()
        try:
            # Find active watchlist items for this listing or route
            watches = session.query(Watchlist).filter(
                Watchlist.active == True,
                Watchlist.listing_type == ListingType(listing_type)
            ).all()
            
            for watch in watches:
                triggered = False
                alert_message = None
                
                # Check price threshold
                if watch.price_threshold and current_price:
                    if current_price <= watch.price_threshold:
                        triggered = True
                        alert_message = f"Price dropped to ${current_price:.2f} (below ${watch.price_threshold:.2f})"
                
                # Check inventory threshold
                if watch.inventory_threshold and inventory is not None:
                    if inventory <= watch.inventory_threshold:
                        triggered = True
                        if alert_message:
                            alert_message += f" | Only {inventory} left"
                        else:
                            alert_message = f"Only {inventory} left (below {watch.inventory_threshold})"
                
                # Check route match
                if watch.route:
                    route_parts = watch.route.split("-")
                    if listing_type == "Flight" and len(route_parts) == 2:
                        # Check if event matches route
                        # Would need to fetch deal to check origin/destination
                        pass
                
                if triggered and self.ws_manager:
                    # Send WebSocket alert
                    await self.ws_manager.send_personal_message(
                        watch.user_id,
                        {
                            "type": "watchlist_alert",
                            "watch_id": watch.id,
                            "listing_id": listing_id,
                            "listing_type": listing_type,
                            "message": alert_message,
                            "event": event
                        }
                    )
                    print(f"[Watchlist] Alert sent to user {watch.user_id} for {listing_id}")
        finally:
            session.close()
    
    async def add_watch(
        self,
        user_id: str,
        listing_type: str,
        listing_id: Optional[str] = None,
        route: Optional[str] = None,
        price_threshold: Optional[float] = None,
        inventory_threshold: Optional[int] = None
    ) -> Watchlist:
        """Add a watchlist item"""
        session = get_session()
        try:
            watch = Watchlist(
                user_id=user_id,
                listing_type=ListingType(listing_type),
                listing_id=listing_id,
                route=route,
                price_threshold=price_threshold,
                inventory_threshold=inventory_threshold,
                active=True
            )
            session.add(watch)
            session.commit()
            session.refresh(watch)
            return watch
        finally:
            session.close()
    
    async def get_user_watches(self, user_id: str) -> List[Watchlist]:
        """Get all active watches for a user"""
        session = get_session()
        try:
            watches = session.query(Watchlist).filter(
                Watchlist.user_id == user_id,
                Watchlist.active == True
            ).all()
            return watches
        finally:
            session.close()
    
    async def remove_watch(self, watch_id: int, user_id: str) -> bool:
        """Deactivate a watchlist item"""
        session = get_session()
        try:
            watch = session.query(Watchlist).filter(
                Watchlist.id == watch_id,
                Watchlist.user_id == user_id
            ).first()
            
            if watch:
                watch.active = False
                session.commit()
                return True
            return False
        finally:
            session.close()


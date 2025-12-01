"""
WebSocket Relay: Relay deal.events from Kafka to WebSocket clients
"""
import asyncio
import json
from aiokafka import AIOKafkaConsumer
from src.config.kafka_config import KAFKA_BOOTSTRAP_SERVERS, TOPIC_DEAL_EVENTS

class WebSocketRelay:
    def __init__(self, ws_manager):
        self.ws_manager = ws_manager
        self.consumer: AIOKafkaConsumer = None
        self.running = True
    
    async def start(self):
        """Start consuming deal.events and relaying to WebSocket"""
        try:
            self.consumer = AIOKafkaConsumer(
                TOPIC_DEAL_EVENTS,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id="websocket-relay-group",
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                enable_auto_commit=True,
                consumer_timeout_ms=1000  # Timeout to allow checking self.running
            )
            await self.consumer.start()
            print("[WebSocket Relay] Started consuming deal.events")
            
            # Run consumer in background without blocking
            while self.running:
                try:
                    # Get messages with timeout to allow checking self.running
                    msg_pack = await asyncio.wait_for(
                        self.consumer.getmany(timeout_ms=1000, max_records=10),
                        timeout=1.0
                    )
                    
                    for topic_partition, messages in msg_pack.items():
                        for message in messages:
                            event = message.value
                            # Broadcast to all subscribers of deal.events topic
                            await self.ws_manager.broadcast("deal.events", event)
                            
                except asyncio.TimeoutError:
                    # Timeout is expected, continue loop to check self.running
                    continue
                except Exception as e:
                    if self.running:
                        print(f"[WebSocket Relay] Error consuming message: {e}")
                        # Don't raise, continue trying
                        await asyncio.sleep(1)
                    else:
                        break
                        
        except Exception as e:
            print(f"[WebSocket Relay] Initialization error: {e}")
            print("[WebSocket Relay] Continuing without Kafka (WebSocket will still work)")
            # Don't raise - allow service to continue without Kafka
        finally:
            # Don't stop here, let it run in background
            pass
    
    async def stop(self):
        """Stop consumer"""
        if self.consumer:
            await self.consumer.stop()
            print("[WebSocket Relay] Stopped")


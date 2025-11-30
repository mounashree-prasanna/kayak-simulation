"""
Kafka Consumer Service for WebSocket Bridge

Consumes events from Kafka topics and broadcasts them to WebSocket clients.
This enables real-time event streaming from backend services to the frontend.
"""

from kafka import KafkaConsumer
from kafka.errors import KafkaError
import json
import os
import asyncio
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KafkaConsumerService:
    """Service that consumes Kafka events and broadcasts via WebSocket"""
    
    def __init__(self, websocket_manager):
        """
        Initialize Kafka Consumer Service
        
        Args:
            websocket_manager: ConnectionManager instance for broadcasting events
        """
        self.websocket_manager = websocket_manager
        self.consumer: Optional[KafkaConsumer] = None
        self.is_running = False
        self.consume_task = None
        
        # Kafka configuration
        self.kafka_broker = os.getenv("KAFKA_BROKER", "localhost:9092")
        # Convert Docker service name to proper format
        if ":" not in self.kafka_broker:
            self.kafka_broker = f"{self.kafka_broker}:9092"
        
        # Topics to consume
        self.topics = [
            "booking.events",
            "billing.events",
            "deal.events",
            "user.events",
            "tracking.events"
        ]
        
        logger.info(f"[Kafka Consumer] Initialized with broker: {self.kafka_broker}")
        logger.info(f"[Kafka Consumer] Topics to consume: {self.topics}")
    
    async def start(self):
        """Start consuming from Kafka topics"""
        if self.is_running:
            logger.warning("[Kafka Consumer] Already running")
            return
        
        try:
            # Create Kafka consumer
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=[self.kafka_broker],
                value_deserializer=lambda m: json.loads(m.decode('utf-8')) if m else None,
                consumer_timeout_ms=1000,  # Timeout for polling
                enable_auto_commit=True,
                auto_offset_reset='latest',  # Only consume new messages
                group_id='recommendation-service-websocket-bridge',
                api_version=(0, 10, 1)
            )
            
            logger.info(f"[Kafka Consumer] Connected to Kafka broker: {self.kafka_broker}")
            logger.info(f"[Kafka Consumer] Subscribed to topics: {self.topics}")
            
            self.is_running = True
            
            # Start consuming in background task
            self.consume_task = asyncio.create_task(self._consume_loop())
            
        except Exception as e:
            logger.error(f"[Kafka Consumer] Failed to start: {str(e)}")
            logger.warning("[Kafka Consumer] Service will continue without Kafka bridge")
            self.is_running = False
            # Don't raise - allow service to continue without Kafka
    
    async def _consume_loop(self):
        """Main consumption loop"""
        logger.info("[Kafka Consumer] Starting consumption loop...")
        
        loop = asyncio.get_event_loop()
        
        while self.is_running:
            try:
                # Poll for messages (run blocking call in executor to avoid blocking event loop)
                message_pack = await loop.run_in_executor(
                    None, 
                    lambda: self.consumer.poll(timeout_ms=1000)
                )
                
                if not message_pack:
                    # No messages, continue polling
                    await asyncio.sleep(0.1)
                    continue
                
                for topic_partition, messages in message_pack.items():
                    topic = topic_partition.topic
                    
                    for message in messages:
                        try:
                            # Parse event data
                            event_data = message.value
                            
                            if not event_data:
                                continue
                            
                            # Extract event type and data
                            event_type = event_data.get('event_type', 'unknown')
                            data = event_data.get('data', event_data)
                            
                            # Transform to frontend format
                            # Frontend expects: { eventType, booking, ... } or { eventType, ...data }
                            frontend_message = {
                                "eventType": event_type,
                                "event_type": event_type,  # Support both formats
                            }
                            
                            # For booking events, wrap data in 'booking' key if it's a booking object
                            if topic == "booking.events" and isinstance(data, dict):
                                if "booking_id" in data or "booking_type" in data:
                                    frontend_message["booking"] = data
                                frontend_message.update(data)  # Also spread for compatibility
                            else:
                                # For other events, spread the data
                                frontend_message.update(data)
                            
                            # Broadcast to WebSocket clients
                            await self.websocket_manager.broadcast(topic, frontend_message)
                            
                            logger.info(f"[Kafka Consumer] Broadcasted {event_type} from {topic} to WebSocket clients")
                            
                        except Exception as e:
                            logger.error(f"[Kafka Consumer] Error processing message: {str(e)}")
                            continue
                
            except KafkaError as e:
                logger.error(f"[Kafka Consumer] Kafka error: {str(e)}")
                # Wait before retrying
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"[Kafka Consumer] Unexpected error: {str(e)}")
                await asyncio.sleep(5)
        
        logger.info("[Kafka Consumer] Consumption loop stopped")
    
    async def stop(self):
        """Stop consuming from Kafka"""
        logger.info("[Kafka Consumer] Stopping...")
        self.is_running = False
        
        if self.consume_task:
            self.consume_task.cancel()
            try:
                await self.consume_task
            except asyncio.CancelledError:
                pass
        
        if self.consumer:
            try:
                self.consumer.close()
            except Exception as e:
                logger.error(f"[Kafka Consumer] Error closing consumer: {str(e)}")
        
        logger.info("[Kafka Consumer] Stopped")


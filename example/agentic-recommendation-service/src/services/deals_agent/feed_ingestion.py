"""
Feed Ingestion Stage: Read CSV datasets and publish to Kafka topic raw_supplier_feeds
"""
import asyncio
import csv
import json
from datetime import datetime
from typing import Dict, Any
from aiokafka import AIOKafkaProducer
from src.config.kafka_config import KAFKA_BOOTSTRAP_SERVERS, TOPIC_RAW_SUPPLIER_FEEDS

class FeedIngestion:
    def __init__(self):
        self.producer: AIOKafkaProducer = None
    
    async def start(self):
        """Start Kafka producer"""
        self.producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            enable_idempotence=True
        )
        await self.producer.start()
        print("[Feed Ingestion] Producer started")
    
    async def stop(self):
        """Stop Kafka producer"""
        if self.producer:
            await self.producer.stop()
            print("[Feed Ingestion] Producer stopped")
    
    async def ingest_csv(self, file_path: str, listing_type: str = "Hotel"):
        """
        Read CSV file row-by-row and publish to raw_supplier_feeds topic
        
        Expected CSV columns vary by type:
        - Hotels: hotel_id, hotel_name, city, check_in, check_out, price, rooms_available, amenities, etc.
        - Flights: flight_id, airline, origin, destination, departure, arrival, price, seats_available, etc.
        """
        try:
            import aiofiles
            
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                reader = csv.DictReader(content.splitlines())
                
                count = 0
                for row in reader:
                    # Normalize row data
                    raw_record = {
                        "listing_type": listing_type,
                        "raw_data": dict(row),
                        "ingested_at": datetime.now().isoformat(),
                        "source_file": file_path
                    }
                    
                    # Publish to Kafka
                    # Map different ID column names
                    listing_id = (row.get("id") or row.get("listing_id") or 
                                 row.get("hotel_id") or row.get("flight_id") or 
                                 row.get("flight") or "")
                    
                    await self.producer.send(
                        TOPIC_RAW_SUPPLIER_FEEDS,
                        value=raw_record,
                        key=str(listing_id).encode() if listing_id else b"unknown"
                    )
                    count += 1
                    
                    if count % 100 == 0:
                        print(f"[Feed Ingestion] Published {count} records...")
                
                print(f"[Feed Ingestion] Completed: {count} records published from {file_path}")
        except Exception as e:
            print(f"[Feed Ingestion] Error ingesting {file_path}: {e}")
            raise
    
    async def ingest_from_dict(self, data: Dict[str, Any], listing_type: str = "Hotel"):
        """Ingest a single record from dictionary"""
        raw_record = {
            "listing_type": listing_type,
            "raw_data": data,
            "ingested_at": datetime.now().isoformat(),
            "source": "api"
        }
        
        listing_id = data.get("listing_id") or data.get("hotel_id") or data.get("flight_id", "")
        await self.producer.send(
            TOPIC_RAW_SUPPLIER_FEEDS,
            value=raw_record,
            key=str(listing_id).encode()
        )


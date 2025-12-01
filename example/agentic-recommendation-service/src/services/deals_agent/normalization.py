"""
Normalization Stage: Read from raw_supplier_feeds, clean and normalize, write to deals.normalized
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from src.config.kafka_config import (
    KAFKA_BOOTSTRAP_SERVERS,
    TOPIC_RAW_SUPPLIER_FEEDS,
    TOPIC_DEALS_NORMALIZED,
    CONSUMER_GROUP_NORMALIZER
)

class NormalizationStage:
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.producer: AIOKafkaProducer = None
    
    async def start(self):
        """Start consumer and producer"""
        self.consumer = AIOKafkaConsumer(
            TOPIC_RAW_SUPPLIER_FEEDS,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=CONSUMER_GROUP_NORMALIZER,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            enable_auto_commit=True
        )
        await self.consumer.start()
        
        self.producer = AIOKafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            enable_idempotence=True
        )
        await self.producer.start()
        print("[Normalization] Consumer and producer started")
    
    async def stop(self):
        """Stop consumer and producer"""
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        print("[Normalization] Stopped")
    
    def normalize_date(self, date_str: str) -> datetime:
        """Normalize various date formats to datetime"""
        from dateutil import parser
        try:
            return parser.parse(date_str)
        except:
            return datetime.now()
    
    def normalize_price(self, price_str: Any) -> float:
        """Normalize currency strings to float"""
        if isinstance(price_str, (int, float)):
            return float(price_str)
        
        if isinstance(price_str, str):
            # Remove currency symbols and commas
            cleaned = price_str.replace('$', '').replace(',', '').replace('USD', '').strip()
            try:
                return float(cleaned)
            except:
                return 0.0
        
        return 0.0
    
    def normalize_availability(self, avail_str: Any) -> int:
        """Normalize availability to integer"""
        if isinstance(avail_str, (int, float)):
            return int(avail_str)
        if isinstance(avail_str, str):
            # Extract numbers
            import re
            numbers = re.findall(r'\d+', avail_str)
            if numbers:
                return int(numbers[0])
        return 0
    
    def normalize_amenities(self, amenities_str: Any) -> Dict[str, bool]:
        """Parse amenities from string or dict"""
        if isinstance(amenities_str, dict):
            return amenities_str
        
        if isinstance(amenities_str, str):
            # Try JSON first
            try:
                return json.loads(amenities_str)
            except:
                # Parse comma-separated or other formats
                amenities = {}
                for item in amenities_str.split(','):
                    item = item.strip().lower()
                    if item:
                        amenities[item] = True
                return amenities
        
        return {}
    
    async def normalize_record(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a raw record"""
        raw_data = raw_record.get("raw_data", {})
        listing_type = raw_record.get("listing_type", "Hotel")
        
        normalized = {
            "listing_type": listing_type,
            "normalized_at": datetime.now().isoformat(),
        }
        
        if listing_type == "Hotel":
            # Map various column names from different datasets
            # Airbnb: id, name, neighbourhood_cleansed, city, price, amenities, etc.
            # Hotel Booking: hotel, arrival_date_year, arrival_date_month, arrival_date_day_of_month, adr (average daily rate), etc.
            
            listing_id = (raw_data.get("id") or raw_data.get("hotel_id") or 
                         raw_data.get("listing_id") or str(raw_data.get("_id", "")))
            
            hotel_name = (raw_data.get("name") or raw_data.get("hotel_name") or 
                         raw_data.get("property_name", ""))
            
            city = (raw_data.get("city") or raw_data.get("neighbourhood_cleansed") or 
                   raw_data.get("neighbourhood") or "")
            
            # For Airbnb: use price field, for hotel booking: use adr (average daily rate)
            price = (raw_data.get("price") or raw_data.get("adr") or 
                    raw_data.get("base_price") or raw_data.get("current_price") or 0)
            
            # For Airbnb: availability_30 or availability_365, for hotel booking: calculate from booking data
            rooms_available = (raw_data.get("availability_30") or 
                              raw_data.get("availability_365") or
                              raw_data.get("rooms_available") or 
                              raw_data.get("rooms_left") or 0)
            
            # Parse amenities - Airbnb has it as JSON string or comma-separated
            amenities_str = (raw_data.get("amenities") or 
                           raw_data.get("amenities_list") or "")
            
            normalized.update({
                "listing_id": str(listing_id),
                "hotel_name": str(hotel_name),
                "city": str(city),
                "check_in": self.normalize_date(raw_data.get("check_in") or raw_data.get("last_scraped") or datetime.now().isoformat()).isoformat(),
                "check_out": self.normalize_date(raw_data.get("check_out") or datetime.now().isoformat()).isoformat(),
                "base_price": self.normalize_price(price),
                "current_price": self.normalize_price(price),
                "rooms_left": self.normalize_availability(rooms_available),
                "amenities": self.normalize_amenities(amenities_str),
                "cancellation_window": int(raw_data.get("cancellation_window", 0)) if raw_data.get("cancellation_window") else None,
            })
        elif listing_type == "Flight":
            # Map various column names from different datasets
            # Flight Price Prediction: airline, flight, source_city, destination_city, departure_time, arrival_time, stops, duration, price, class, days_left
            
            listing_id = (raw_data.get("flight") or raw_data.get("flight_id") or 
                         raw_data.get("listing_id") or "")
            
            airline = (raw_data.get("airline") or raw_data.get("airline_name") or "")
            
            origin = (raw_data.get("source_city") or raw_data.get("origin") or 
                    raw_data.get("departure_airport") or "")
            
            destination = (raw_data.get("destination_city") or raw_data.get("dest") or 
                          raw_data.get("destination") or raw_data.get("arrival_airport") or "")
            
            departure_time = (raw_data.get("departure_time") or 
                            raw_data.get("departure") or 
                            raw_data.get("departure_date") or 
                            raw_data.get("departure_datetime", ""))
            
            arrival_time = (raw_data.get("arrival_time") or 
                          raw_data.get("arrival") or 
                          raw_data.get("arrival_date") or 
                          raw_data.get("arrival_datetime", ""))
            
            price = (raw_data.get("price") or 
                    raw_data.get("ticket_price") or 
                    raw_data.get("base_price") or 
                    raw_data.get("current_price") or 0)
            
            # Duration might be in minutes or hours:minutes format
            duration_str = raw_data.get("duration") or raw_data.get("duration_minutes") or 0
            duration_minutes = None
            if duration_str:
                if isinstance(duration_str, (int, float)):
                    duration_minutes = int(duration_str)
                elif isinstance(duration_str, str):
                    # Try to parse "HH:MM" format or just minutes
                    if ':' in duration_str:
                        parts = duration_str.split(':')
                        duration_minutes = int(parts[0]) * 60 + int(parts[1])
                    else:
                        try:
                            duration_minutes = int(float(duration_str))
                        except:
                            duration_minutes = None
            
            flight_class = (raw_data.get("class") or 
                          raw_data.get("flight_class") or 
                          "Economy")
            
            # Stops information
            stops = raw_data.get("stops") or 0
            
            normalized.update({
                "listing_id": str(listing_id),
                "airline": str(airline),
                "origin": str(origin),
                "destination": str(destination),
                "departure_date": self.normalize_date(departure_time).isoformat(),
                "arrival_date": self.normalize_date(arrival_time).isoformat(),
                "base_price": self.normalize_price(price),
                "current_price": self.normalize_price(price),
                "seats_left": self.normalize_availability(raw_data.get("seats_available") or raw_data.get("seats_left") or raw_data.get("total_available_seats") or 50),  # Default to 50 if not specified
                "flight_class": str(flight_class),
                "duration_minutes": duration_minutes,
                "stops": int(stops) if stops else 0,
            })
        
        return normalized
    
    async def process(self):
        """Main processing loop"""
        print("[Normalization] Starting processing loop...")
        try:
            async for message in self.consumer:
                try:
                    raw_record = message.value
                    normalized = await self.normalize_record(raw_record)
                    
                    # Publish to normalized topic
                    listing_id = normalized.get("listing_id", "")
                    await self.producer.send(
                        TOPIC_DEALS_NORMALIZED,
                        value=normalized,
                        key=str(listing_id).encode()
                    )
                    
                    print(f"[Normalization] Normalized {normalized.get('listing_type')} {listing_id}")
                except Exception as e:
                    print(f"[Normalization] Error processing record: {e}")
        except Exception as e:
            print(f"[Normalization] Consumer error: {e}")
            raise


"""
Offer Tagger: Read from deals.scored, tag using metadata, write to deals.tagged
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from src.config.kafka_config import (
    KAFKA_BOOTSTRAP_SERVERS,
    TOPIC_DEALS_SCORED,
    TOPIC_DEALS_TAGGED,
    TOPIC_DEAL_EVENTS,
    CONSUMER_GROUP_OFFER_TAGGER
)
from src.database_sqlite import get_session, HotelDeal, FlightDeal

class OfferTagger:
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.producer: AIOKafkaProducer = None
    
    async def start(self):
        """Start consumer and producer"""
        self.consumer = AIOKafkaConsumer(
            TOPIC_DEALS_SCORED,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=CONSUMER_GROUP_OFFER_TAGGER,
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
        print("[Offer Tagger] Consumer and producer started")
    
    async def stop(self):
        """Stop consumer and producer"""
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        print("[Offer Tagger] Stopped")
    
    def tag_hotel(self, scored: Dict[str, Any]) -> Dict[str, bool]:
        """Tag hotel deal using metadata only (no NLP)"""
        tags = {}
        amenities = scored.get("amenities", {})
        
        # Pet-friendly tag
        if isinstance(amenities, dict):
            tags["pet_friendly"] = amenities.get("pet_friendly", False) or \
                                  amenities.get("pets_allowed", False) or \
                                  "pet" in str(amenities).lower()
        elif isinstance(amenities, str):
            tags["pet_friendly"] = "pet" in amenities.lower()
        else:
            tags["pet_friendly"] = False
        
        # Near transit tag (check city/metadata)
        city = scored.get("city", "").lower()
        # Common transit-friendly cities
        transit_cities = ["new york", "san francisco", "chicago", "boston", "washington", "london", "paris"]
        tags["near_transit"] = any(tc in city for tc in transit_cities)
        
        # Breakfast tag
        if isinstance(amenities, dict):
            tags["breakfast"] = amenities.get("breakfast", False) or \
                               amenities.get("free_breakfast", False) or \
                               "breakfast" in str(amenities).lower()
        elif isinstance(amenities, str):
            tags["breakfast"] = "breakfast" in amenities.lower()
        else:
            tags["breakfast"] = False
        
        # Refundable tag
        cancellation_window = scored.get("cancellation_window")
        tags["refundable"] = cancellation_window is not None and cancellation_window > 0
        
        # Parking tag
        if isinstance(amenities, dict):
            tags["parking"] = amenities.get("parking", False) or \
                             amenities.get("free_parking", False) or \
                             "parking" in str(amenities).lower()
        elif isinstance(amenities, str):
            tags["parking"] = "parking" in amenities.lower()
        else:
            tags["parking"] = False
        
        return tags
    
    def tag_flight(self, scored: Dict[str, Any]) -> Dict[str, bool]:
        """Tag flight deal using metadata only"""
        tags = {}
        
        # Refundable tag (check flight class or metadata)
        flight_class = scored.get("flight_class", "").lower()
        tags["refundable"] = flight_class in ["business", "first"] or \
                            scored.get("refundable", False)
        
        # Avoid red-eye tag (check departure time)
        departure_date = scored.get("departure_date")
        if departure_date:
            try:
                from dateutil import parser
                dep_dt = parser.parse(departure_date)
                hour = dep_dt.hour
                # Red-eye: typically 10 PM - 5 AM
                tags["avoid_red_eye"] = not (hour >= 22 or hour < 5)
            except:
                tags["avoid_red_eye"] = True  # Default to avoiding red-eye
        
        return tags
    
    async def tag_deal(self, scored: Dict[str, Any]) -> Dict[str, Any]:
        """Tag a scored deal"""
        listing_type = scored.get("listing_type", "Hotel")
        
        if listing_type == "Hotel":
            tags = self.tag_hotel(scored)
        else:
            tags = self.tag_flight(scored)
        
        tagged = {
            **scored,
            "tags": tags,
            "tagged_at": datetime.now().isoformat()
        }
        
        return tagged
    
    async def persist_deal(self, tagged: Dict[str, Any]):
        """Persist tagged deal to SQLite"""
        session = get_session()
        try:
            listing_type = tagged.get("listing_type")
            listing_id = tagged.get("listing_id")
            
            if listing_type == "Hotel":
                from dateutil import parser
                deal = HotelDeal(
                    listing_id=listing_id,
                    hotel_name=tagged.get("hotel_name"),
                    city=tagged.get("city"),
                    check_in=parser.parse(tagged.get("check_in")),
                    check_out=parser.parse(tagged.get("check_out")),
                    base_price=tagged.get("base_price", 0),
                    current_price=tagged.get("current_price", 0),
                    avg_30d_price=tagged.get("avg_30d_price"),
                    deal_score=tagged.get("deal_score", 0),
                    rooms_left=tagged.get("rooms_left"),
                    limited_availability=tagged.get("rooms_left", 0) < 5,
                    pet_friendly=tagged.get("tags", {}).get("pet_friendly", False),
                    near_transit=tagged.get("tags", {}).get("near_transit", False),
                    breakfast=tagged.get("tags", {}).get("breakfast", False),
                    refundable=tagged.get("tags", {}).get("refundable", False),
                    parking=tagged.get("tags", {}).get("parking", False),
                    amenities=json.dumps(tagged.get("amenities", {})),
                    cancellation_window=tagged.get("cancellation_window")
                )
                
                # Check if exists, update or insert
                existing = session.query(HotelDeal).filter(
                    HotelDeal.listing_id == listing_id,
                    HotelDeal.check_in == deal.check_in
                ).first()
                
                if existing:
                    # Update if score improved
                    if deal.deal_score > existing.deal_score:
                        for key, value in deal.model_dump(exclude={"id", "created_at"}).items():
                            setattr(existing, key, value)
                        existing.updated_at = datetime.now()
                else:
                    session.add(deal)
                
            else:  # Flight
                from dateutil import parser
                deal = FlightDeal(
                    listing_id=listing_id,
                    airline=tagged.get("airline"),
                    origin=tagged.get("origin"),
                    destination=tagged.get("destination"),
                    departure_date=parser.parse(tagged.get("departure_date")),
                    arrival_date=parser.parse(tagged.get("arrival_date")),
                    base_price=tagged.get("base_price", 0),
                    current_price=tagged.get("current_price", 0),
                    avg_30d_price=tagged.get("avg_30d_price"),
                    deal_score=tagged.get("deal_score", 0),
                    seats_left=tagged.get("seats_left"),
                    limited_availability=tagged.get("seats_left", 0) < 5,
                    refundable=tagged.get("tags", {}).get("refundable", False),
                    avoid_red_eye=tagged.get("tags", {}).get("avoid_red_eye", True),
                    flight_class=tagged.get("flight_class"),
                    duration_minutes=tagged.get("duration_minutes")
                )
                
                # Check if exists, update or insert
                existing = session.query(FlightDeal).filter(
                    FlightDeal.listing_id == listing_id,
                    FlightDeal.departure_date == deal.departure_date
                ).first()
                
                if existing:
                    # Update if score improved or price changed
                    if deal.deal_score > existing.deal_score or \
                       abs(deal.current_price - existing.current_price) > 1.0:
                        for key, value in deal.model_dump(exclude={"id", "created_at"}).items():
                            setattr(existing, key, value)
                        existing.updated_at = datetime.now()
                        
                        # Emit update event if price changed
                        if abs(deal.current_price - existing.current_price) > 1.0:
                            await self.emit_update_event(tagged, "price_change")
                else:
                    session.add(deal)
                    await self.emit_update_event(tagged, "new_deal")
            
            session.commit()
            print(f"[Offer Tagger] Persisted {listing_type} deal: {listing_id}")
        except Exception as e:
            session.rollback()
            print(f"[Offer Tagger] Error persisting deal: {e}")
        finally:
            session.close()
    
    async def emit_update_event(self, tagged: Dict[str, Any], event_type: str):
        """Emit concise event to deal.events topic"""
        event = {
            "event_type": event_type,  # "new_deal", "price_change", "inventory_change"
            "listing_type": tagged.get("listing_type"),
            "listing_id": tagged.get("listing_id"),
            "current_price": tagged.get("current_price"),
            "deal_score": tagged.get("deal_score"),
            "inventory": tagged.get("rooms_left") or tagged.get("seats_left"),
            "timestamp": datetime.now().isoformat()
        }
        
        listing_id = tagged.get("listing_id", "")
        await self.producer.send(
            TOPIC_DEAL_EVENTS,
            value=event,
            key=str(listing_id).encode()
        )
    
    async def process(self):
        """Main processing loop"""
        print("[Offer Tagger] Starting processing loop...")
        try:
            async for message in self.consumer:
                try:
                    scored = message.value
                    tagged = await self.tag_deal(scored)
                    
                    # Persist to SQLite
                    await self.persist_deal(tagged)
                    
                    # Publish to tagged topic
                    listing_id = tagged.get("listing_id", "")
                    await self.producer.send(
                        TOPIC_DEALS_TAGGED,
                        value=tagged,
                        key=str(listing_id).encode()
                    )
                    
                    print(f"[Offer Tagger] Tagged deal: {listing_id}")
                except Exception as e:
                    print(f"[Offer Tagger] Error processing record: {e}")
        except Exception as e:
            print(f"[Offer Tagger] Consumer error: {e}")
            raise


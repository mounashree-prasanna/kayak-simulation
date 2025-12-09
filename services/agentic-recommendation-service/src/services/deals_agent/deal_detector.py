"""
Deal Detector: Read from deals.normalized, apply deal rules, compute DealScore, write to deals.scored
"""
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from src.config.kafka_config import (
    KAFKA_BOOTSTRAP_SERVERS,
    TOPIC_DEALS_NORMALIZED,
    TOPIC_DEALS_SCORED,
    CONSUMER_GROUP_DEAL_DETECTOR
)
from src.database_sqlite import get_session, HotelDeal, FlightDeal

class DealDetector:
    def __init__(self):
        self.consumer: AIOKafkaConsumer = None
        self.producer: AIOKafkaProducer = None
        self.price_history: Dict[str, list] = {}  # In-memory cache for 30-day averages
    
    async def start(self):
        """Start consumer and producer"""
        self.consumer = AIOKafkaConsumer(
            TOPIC_DEALS_NORMALIZED,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=CONSUMER_GROUP_DEAL_DETECTOR,
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
        print("[Deal Detector] Consumer and producer started")
    
    async def stop(self):
        """Stop consumer and producer"""
        if self.consumer:
            await self.consumer.stop()
        if self.producer:
            await self.producer.stop()
        print("[Deal Detector] Stopped")
    
    async def calculate_30d_average(self, listing_id: str, listing_type: str) -> float:
        """Calculate 30-day average price from historical data"""
        # Check SQLite for historical prices
        session = get_session()
        try:
            if listing_type == "Hotel":
                deals = session.query(HotelDeal).filter(
                    HotelDeal.listing_id == listing_id,
                    HotelDeal.created_at >= datetime.now() - timedelta(days=30)
                ).all()
            else:
                deals = session.query(FlightDeal).filter(
                    FlightDeal.listing_id == listing_id,
                    FlightDeal.created_at >= datetime.now() - timedelta(days=30)
                ).all()
            
            if deals:
                prices = [deal.current_price for deal in deals if deal.current_price > 0]
                if prices:
                    return sum(prices) / len(prices)
        except Exception as e:
            print(f"[Deal Detector] Error calculating 30d average: {e}")
        finally:
            session.close()
        
        # Fallback: use in-memory cache
        if listing_id in self.price_history:
            prices = [p for p in self.price_history[listing_id] if p > 0]
            if prices:
                return sum(prices) / len(prices)
        
        # Default: return current price (no discount)
        return None
    
    def calculate_deal_score(self, normalized: Dict[str, Any], avg_30d_price: float = None) -> int:
        """
        Calculate DealScore (0-100) based on:
        - price vs historical average (50 points)
        - limited availability (30 points)
        - price competitiveness (20 points)
        """
        score = 0
        current_price = normalized.get("current_price", 0)
        base_price = normalized.get("base_price", current_price)
        listing_type = normalized.get("listing_type", "Hotel")
        
        # Price discount scoring (50 points max)
        if avg_30d_price and avg_30d_price > 0:
            discount_ratio = current_price / avg_30d_price
            if discount_ratio <= 0.75:  # 25%+ discount
                score += 50
            elif discount_ratio <= 0.85:  # 15%+ discount
                score += 40
            elif discount_ratio <= 0.90:  # 10%+ discount
                score += 30
            elif discount_ratio <= 0.95:  # 5%+ discount
                score += 20
            elif discount_ratio <= 1.0:
                score += 10
            else:
                score += 5  # Above average but still a listing
        elif current_price < base_price:
            # Some discount even without history
            discount_pct = (base_price - current_price) / base_price if base_price > 0 else 0
            if discount_pct >= 0.15:
                score += 40
            elif discount_pct >= 0.10:
                score += 30
            elif discount_pct >= 0.05:
                score += 20
            else:
                score += 10
        else:
            if listing_type == "Flight":
                if 200 <= current_price <= 600:
                    score += 25  # Competitive flight price
                elif 100 <= current_price < 200 or 600 < current_price <= 800:
                    score += 15
                else:
                    score += 5
            else:  # Hotel
                if 50 <= current_price <= 300:
                    score += 25  # Competitive hotel price
                elif 30 <= current_price < 50 or 300 < current_price <= 500:
                    score += 15
                else:
                    score += 5
        
        rooms_or_seats = normalized.get("rooms_left") or normalized.get("seats_left")
        if rooms_or_seats is not None:
            if rooms_or_seats < 3:
                score += 30  # Very limited
            elif rooms_or_seats < 5:
                score += 25
            elif rooms_or_seats < 10:
                score += 20
            elif rooms_or_seats < 20:
                score += 15
            elif rooms_or_seats < 50:
                score += 10
            else:
                score += 5  
        else:
            score += 5  

        if listing_type == "Flight":
            if current_price <= 400:
                score += 15  # Good price
            elif current_price <= 500:
                score += 10
            elif current_price <= 600:
                score += 5
        else:  # Hotel
            price_per_night = current_price / max(1, normalized.get("rooms_left", 1))
            if price_per_night <= 150:
                score += 15  # Good price
            elif price_per_night <= 250:
                score += 10
            elif price_per_night <= 350:
                score += 5
        
        return min(100, max(10, score))  # Ensure minimum score of 10
    
    async def detect_deal(self, normalized: Dict[str, Any]) -> Dict[str, Any]:
        """Detect if record is a deal and calculate score"""
        listing_id = normalized.get("listing_id", "")
        listing_type = normalized.get("listing_type", "Hotel")
        
        avg_30d_price = await self.calculate_30d_average(listing_id, listing_type)
        
        deal_score = self.calculate_deal_score(normalized, avg_30d_price)
        
        is_deal = deal_score >= 50
        
        scored = {
            **normalized,
            "avg_30d_price": avg_30d_price,
            "deal_score": deal_score,
            "is_deal": is_deal,
            "scored_at": datetime.now().isoformat()
        }
        
        return scored
    
    async def process(self):
        """Main processing loop"""
        print("[Deal Detector] Starting processing loop...")
        try:
            async for message in self.consumer:
                try:
                    normalized = message.value
     
                    scored = await self.detect_deal(normalized)

                    listing_id = scored.get("listing_id", "")
                    await self.producer.send(
                        TOPIC_DEALS_SCORED,
                        value=scored,
                        key=str(listing_id).encode()
                    )
                    is_deal = scored.get("is_deal", False)
                    deal_status = "DEAL" if is_deal else "listing"
                    print(f"[Deal Detector] Scored {deal_status}: {listing_id} (score: {scored['deal_score']})")
                except Exception as e:
                    print(f"[Deal Detector] Error processing record: {e}")
        except Exception as e:
            print(f"[Deal Detector] Consumer error: {e}")
            raise


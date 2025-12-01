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
        - price <= 0.85 × 30-day average (15% discount)
        - limited availability (<5)
        - promo ending
        """
        score = 0
        current_price = normalized.get("current_price", 0)
        base_price = normalized.get("base_price", current_price)
        
        # Price discount scoring (50 points max)
        if avg_30d_price and avg_30d_price > 0:
            discount_ratio = current_price / avg_30d_price
            if discount_ratio <= 0.85:  # 15%+ discount
                score += 50
            elif discount_ratio <= 0.90:  # 10%+ discount
                score += 40
            elif discount_ratio <= 0.95:  # 5%+ discount
                score += 30
            elif discount_ratio <= 1.0:
                score += 15
        elif current_price < base_price:
            # Some discount even without history
            discount_pct = (base_price - current_price) / base_price
            if discount_pct >= 0.15:
                score += 50
            elif discount_pct >= 0.10:
                score += 40
            elif discount_pct >= 0.05:
                score += 30
            else:
                score += 15
        
        # Limited availability scoring (30 points max)
        rooms_or_seats = normalized.get("rooms_left") or normalized.get("seats_left")
        if rooms_or_seats is not None:
            if rooms_or_seats < 5:
                score += 30
            elif rooms_or_seats < 10:
                score += 20
            elif rooms_or_seats < 20:
                score += 10
        
        # Promo ending bonus (20 points max)
        # Check if there's a promo end date (would need to be in normalized data)
        # For now, if price is significantly lower, assume promo
        if avg_30d_price and current_price <= 0.80 * avg_30d_price:
            score += 20
        
        return min(100, score)
    
    async def detect_deal(self, normalized: Dict[str, Any]) -> Dict[str, Any]:
        """Detect if record is a deal and calculate score"""
        listing_id = normalized.get("listing_id", "")
        listing_type = normalized.get("listing_type", "Hotel")
        
        # Calculate 30-day average
        avg_30d_price = await self.calculate_30d_average(listing_id, listing_type)
        
        # Calculate deal score
        deal_score = self.calculate_deal_score(normalized, avg_30d_price)
        
        # Determine if it's a deal (score >= 50)
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
                    
                    # Only process if it looks like a potential deal
                    scored = await self.detect_deal(normalized)
                    
                    # Only publish if it's actually a deal
                    if scored.get("is_deal", False):
                        listing_id = scored.get("listing_id", "")
                        await self.producer.send(
                            TOPIC_DEALS_SCORED,
                            value=scored,
                            key=str(listing_id).encode()
                        )
                        print(f"[Deal Detector] Detected deal: {listing_id} (score: {scored['deal_score']})")
                except Exception as e:
                    print(f"[Deal Detector] Error processing record: {e}")
        except Exception as e:
            print(f"[Deal Detector] Consumer error: {e}")
            raise


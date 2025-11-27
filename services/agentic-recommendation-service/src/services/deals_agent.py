from datetime import datetime, timedelta
from typing import List, Dict, Any
from src.database import get_database
from src.models.deal import DealModel, ListingType
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorCollection

class DealsAgent:
    def __init__(self):
        self.collection_name = "deals"
    
    async def normalize_deal(self, raw_deal: Dict[str, Any]) -> DealModel:
        """Normalize and validate deal data"""
        deal = DealModel(
            listing_type=raw_deal.get("listing_type"),
            listing_id=raw_deal.get("listing_id"),
            date_range=raw_deal.get("date_range", {}),
            base_price=float(raw_deal.get("base_price", 0)),
            current_price=float(raw_deal.get("current_price", 0)),
            tags=raw_deal.get("tags", {}),
            seats_or_rooms_left=raw_deal.get("seats_or_rooms_left"),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        return deal
    
    async def calculate_avg_30d_price(self, listing_type: str, listing_id: str) -> float:
        """Calculate average price over last 30 days from historical data"""
        # In a real system, query historical pricing data
        # For now, return a mock value
        return 500.0
    
    async def score_deal(self, deal: DealModel) -> DealModel:
        """Calculate deal score and update deal"""
        if not deal.avg_30d_price:
            deal.avg_30d_price = await self.calculate_avg_30d_price(
                deal.listing_type.value, deal.listing_id
            )
        
        # Calculate deal score (0-100)
        score = 0
        
        # Price discount (0.85 * avg = 15% discount = good deal)
        if deal.avg_30d_price > 0:
            discount_ratio = deal.current_price / deal.avg_30d_price
            if discount_ratio <= 0.85:
                score += 50  # Great price discount
            elif discount_ratio <= 0.95:
                score += 30  # Moderate discount
            elif discount_ratio <= 1.0:
                score += 10  # Slight discount
        
        # Limited availability bonus
        if deal.limited_availability:
            if deal.seats_or_rooms_left and deal.seats_or_rooms_left < 5:
                score += 30
            else:
                score += 15
        
        # Tags bonus
        if deal.tags.get("refundability"):
            score += 10
        if deal.tags.get("pet_friendly"):
            score += 5
        if deal.tags.get("breakfast"):
            score += 5
        
        deal.deal_score = min(100, score)
        deal.limited_availability = deal.seats_or_rooms_left is not None and deal.seats_or_rooms_left < 5
        
        return deal
    
    async def save_deal(self, deal: DealModel) -> bool:
        """Save deal to MongoDB"""
        try:
            db = await get_database()
            collection = db[self.collection_name]
            
            deal_dict = deal.model_dump(exclude={"_id", "created_at", "updated_at"})
            deal_dict["created_at"] = datetime.now()
            deal_dict["updated_at"] = datetime.now()
            
            # Check if deal exists
            existing = await collection.find_one({
                "listing_type": deal.listing_type.value,
                "listing_id": deal.listing_id,
                "date_range.start": deal.date_range.get("start")
            })
            
            if existing:
                # Update existing deal if score improved
                if deal.deal_score > existing.get("deal_score", 0):
                    await collection.update_one(
                        {"_id": existing["_id"]},
                        {"$set": deal_dict}
                    )
                    return True
                return False
            else:
                # Insert new deal
                await collection.insert_one(deal_dict)
                return True
        except Exception as e:
            print(f"Error saving deal: {e}")
            return False
    
    async def ingest_deals_from_csv(self, file_path: str):
        """Ingest deals from CSV file (mock implementation)"""
        # In a real system, read CSV and process
        print(f"[Deals Agent] Would ingest deals from {file_path}")
        pass


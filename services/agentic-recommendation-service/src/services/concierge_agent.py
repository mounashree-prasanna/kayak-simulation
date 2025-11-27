from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from src.database import get_database
from src.models.bundle import BundleRecommendation, FlightBundle, HotelBundle, BundleRequest
from src.models.deal import ListingType

class ConciergeAgent:
    def __init__(self):
        self.deals_collection_name = "deals"
    
    async def find_matching_deals(
        self, 
        origin: str,
        destination: str,
        checkin: datetime,
        checkout: datetime,
        constraints: Dict[str, Any]
    ) -> tuple[List[Dict], List[Dict]]:
        """Find matching flight and hotel deals"""
        db = await get_database()
        deals_collection = db[self.deals_collection_name]
        
        # Query flight deals
        flight_deals = await deals_collection.find({
            "listing_type": ListingType.FLIGHT.value,
            "date_range.start": {"$gte": checkin, "$lte": checkin + timedelta(days=1)}
        }).to_list(length=10)
        
        # Query hotel deals
        hotel_deals = await deals_collection.find({
            "listing_type": ListingType.HOTEL.value,
            "date_range.start": {"$lte": checkin},
            "date_range.end": {"$gte": checkout}
        }).to_list(length=10)
        
        return flight_deals, hotel_deals
    
    async def compute_fit_score(
        self,
        flight_deal: Dict,
        hotel_deal: Dict,
        request: BundleRequest
    ) -> float:
        """Compute fit score for a bundle (0-100)"""
        score = 0.0
        
        # Price vs budget (40 points)
        total_price = flight_deal.get("current_price", 0) + hotel_deal.get("current_price", 0)
        if request.budget > 0:
            price_ratio = total_price / request.budget
            if price_ratio <= 0.8:
                score += 40
            elif price_ratio <= 0.95:
                score += 30
            elif price_ratio <= 1.0:
                score += 20
            elif price_ratio <= 1.1:
                score += 10
        
        # Amenity matches (30 points)
        constraints = request.constraints or {}
        hotel_tags = hotel_deal.get("tags", {})
        
        if constraints.get("pet_friendly") and hotel_tags.get("pet_friendly"):
            score += 10
        if constraints.get("breakfast") and hotel_tags.get("breakfast"):
            score += 10
        if constraints.get("near_transit") and hotel_tags.get("near_transit"):
            score += 10
        
        # Deal scores (20 points)
        flight_score = flight_deal.get("deal_score", 0)
        hotel_score = hotel_deal.get("deal_score", 0)
        avg_deal_score = (flight_score + hotel_score) / 2
        score += (avg_deal_score / 100) * 20
        
        # Limited availability bonus (10 points)
        if flight_deal.get("limited_availability") or hotel_deal.get("limited_availability"):
            score += 10
        
        return min(100.0, score)
    
    async def compose_bundles(self, request: BundleRequest) -> List[BundleRecommendation]:
        """Compose 2-3 flight+hotel bundles"""
        flight_deals, hotel_deals = await self.find_matching_deals(
            request.origin,
            request.destination,
            request.checkin,
            request.checkout,
            request.constraints
        )
        
        bundles = []
        
        # Combine top deals
        for flight_deal in flight_deals[:3]:
            for hotel_deal in hotel_deals[:3]:
                if len(bundles) >= 3:
                    break
                
                fit_score = await self.compute_fit_score(flight_deal, hotel_deal, request)
                
                # Create bundle
                total_price = flight_deal.get("current_price", 0) + hotel_deal.get("current_price", 0)
                
                bundle = BundleRecommendation(
                    flight=FlightBundle(
                        flight_id=flight_deal.get("listing_id", ""),
                        airline="Airline",  # Would fetch from listing service
                        price=flight_deal.get("current_price", 0),
                        departure=request.checkin,
                        arrival=request.checkin + timedelta(hours=3)
                    ),
                    hotel=HotelBundle(
                        hotel_id=hotel_deal.get("listing_id", ""),
                        name="Hotel",  # Would fetch from listing service
                        price_per_night=hotel_deal.get("current_price", 0) / 3,
                        total_nights=3,
                        total_price=hotel_deal.get("current_price", 0),
                        amenities=hotel_deal.get("tags", {})
                    ),
                    total_price=total_price,
                    fit_score=fit_score,
                    why_this=self.generate_why_this(flight_deal, hotel_deal, fit_score),
                    what_to_watch=self.generate_what_to_watch(flight_deal, hotel_deal)
                )
                
                bundles.append(bundle)
        
        # Sort by fit score
        bundles.sort(key=lambda x: x.fit_score, reverse=True)
        
        return bundles[:3]
    
    def generate_why_this(self, flight_deal: Dict, hotel_deal: Dict, fit_score: float) -> str:
        """Generate 'why this' description (max 25 words)"""
        reasons = []
        if fit_score > 80:
            reasons.append("Excellent value")
        if flight_deal.get("deal_score", 0) > 70:
            reasons.append("great flight deal")
        if hotel_deal.get("deal_score", 0) > 70:
            reasons.append("hotel discount")
        if hotel_deal.get("tags", {}).get("breakfast"):
            reasons.append("breakfast included")
        
        if not reasons:
            reasons.append("Good combination")
        
        return " ".join(reasons[:5])
    
    def generate_what_to_watch(self, flight_deal: Dict, hotel_deal: Dict) -> str:
        """Generate 'what to watch' description (max 12 words)"""
        warnings = []
        if flight_deal.get("limited_availability"):
            warnings.append("Limited seats")
        if hotel_deal.get("limited_availability"):
            warnings.append("Few rooms left")
        if not flight_deal.get("tags", {}).get("refundability"):
            warnings.append("Non-refundable")
        
        if not warnings:
            warnings.append("Book soon")
        
        return " ".join(warnings[:3])


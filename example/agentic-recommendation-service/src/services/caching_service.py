"""
Adaptive Caching Strategy:
- Hot-path caching (most frequently searched routes)
- Popularity-based caching (tracked in MongoDB)
- LRU caching (Redis built-in)
"""
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from src.config.redis_config import get_redis
from src.database_mongodb import increment_search_popularity, get_hot_routes
from src.database_sqlite import get_session, HotelDeal, FlightDeal

class CachingService:
    def __init__(self):
        self.redis = None
        self.cache_ttl = 3600  # 1 hour default TTL
    
    async def initialize(self):
        """Initialize Redis connection"""
        self.redis = await get_redis()
    
    async def get_cached_deals(self, route: str, listing_type: str = "Flight") -> Optional[List[Dict]]:
        """Get cached deals for a route"""
        if not self.redis:
            await self.initialize()
        
        cache_key = f"deals:route:{route}:{listing_type.lower()}s"
        cached = await self.redis.get(cache_key)
        
        if cached:
            return json.loads(cached)
        return None
    
    async def cache_deals(self, route: str, listing_type: str, deals: List[Dict], ttl: int = None):
        """Cache deals for a route"""
        if not self.redis:
            await self.initialize()
        
        cache_key = f"deals:route:{route}:{listing_type.lower()}s"
        ttl = ttl or self.cache_ttl
        
        await self.redis.setex(
            cache_key,
            ttl,
            json.dumps(deals)
        )
    
    async def get_cached_listing(self, listing_id: str) -> Optional[Dict]:
        """Get cached individual listing"""
        if not self.redis:
            await self.initialize()
        
        cache_key = f"deals:listing:{listing_id}"
        cached = await self.redis.get(cache_key)
        
        if cached:
            return json.loads(cached)
        return None
    
    async def cache_listing(self, listing_id: str, deal: Dict, ttl: int = None):
        """Cache individual listing"""
        if not self.redis:
            await self.initialize()
        
        cache_key = f"deals:listing:{listing_id}"
        ttl = ttl or self.cache_ttl
        
        await self.redis.setex(
            cache_key,
            ttl,
            json.dumps(deal)
        )
    
    async def track_search(self, user_id: str, route: str):
        """Track search for popularity-based caching"""
        await increment_search_popularity(user_id, route)
    
    async def get_hot_routes(self, limit: int = 10) -> List[Dict]:
        """Get hot routes for hot-path caching"""
        return await get_hot_routes(limit)
    
    async def warm_cache_for_hot_routes(self):
        """Warm cache for hot routes (background task)"""
        hot_routes = await self.get_hot_routes(limit=20)
        
        for route_data in hot_routes:
            route = route_data.get("route", "")
            if not route:
                continue
            
            # Parse route (format: "origin-destination" for flights, "city" for hotels)
            if "-" in route:
                # Flight route
                parts = route.split("-")
                if len(parts) == 2:
                    origin, destination = parts
                    await self._cache_route_deals(route, "Flight", origin, destination)
            else:
                # Hotel route (city)
                await self._cache_route_deals(route, "Hotel", city=route)
    
    async def _cache_route_deals(self, route: str, listing_type: str, origin: str = None, 
                                 destination: str = None, city: str = None):
        """Cache deals for a specific route"""
        session = get_session()
        try:
            if listing_type == "Flight" and origin and destination:
                deals = session.query(FlightDeal).filter(
                    FlightDeal.origin == origin,
                    FlightDeal.destination == destination,
                    FlightDeal.departure_date >= datetime.now()
                ).order_by(FlightDeal.deal_score.desc()).limit(10).all()
                
                deals_dict = [self._flight_deal_to_dict(d) for d in deals]
                await self.cache_deals(route, "Flight", deals_dict, ttl=7200)  # 2 hours for hot routes
                
            elif listing_type == "Hotel" and city:
                deals = session.query(HotelDeal).filter(
                    HotelDeal.city == city,
                    HotelDeal.check_in >= datetime.now()
                ).order_by(HotelDeal.deal_score.desc()).limit(10).all()
                
                deals_dict = [self._hotel_deal_to_dict(d) for d in deals]
                await self.cache_deals(route, "Hotel", deals_dict, ttl=7200)
        except Exception as e:
            print(f"[Caching] Error warming cache for {route}: {e}")
        finally:
            session.close()
    
    def _flight_deal_to_dict(self, deal: FlightDeal) -> Dict:
        """Convert FlightDeal to dict"""
        return {
            "listing_id": deal.listing_id,
            "airline": deal.airline,
            "origin": deal.origin,
            "destination": deal.destination,
            "departure_date": deal.departure_date.isoformat(),
            "arrival_date": deal.arrival_date.isoformat(),
            "current_price": deal.current_price,
            "base_price": deal.base_price,
            "deal_score": deal.deal_score,
            "seats_left": deal.seats_left,
            "limited_availability": deal.limited_availability,
            "refundable": deal.refundable,
            "avoid_red_eye": deal.avoid_red_eye,
            "flight_class": deal.flight_class
        }
    
    def _hotel_deal_to_dict(self, deal: HotelDeal) -> Dict:
        """Convert HotelDeal to dict"""
        return {
            "listing_id": deal.listing_id,
            "hotel_name": deal.hotel_name,
            "city": deal.city,
            "check_in": deal.check_in.isoformat(),
            "check_out": deal.check_out.isoformat(),
            "current_price": deal.current_price,
            "base_price": deal.base_price,
            "deal_score": deal.deal_score,
            "rooms_left": deal.rooms_left,
            "limited_availability": deal.limited_availability,
            "pet_friendly": deal.pet_friendly,
            "near_transit": deal.near_transit,
            "breakfast": deal.breakfast,
            "refundable": deal.refundable,
            "parking": deal.parking
        }


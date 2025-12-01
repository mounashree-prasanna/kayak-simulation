from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from src.services.caching_service import CachingService
from src.database_sqlite import get_session, HotelDeal, FlightDeal
from datetime import datetime

router = APIRouter()
cache_service = CachingService()

@router.get("/{route}")
async def get_deals(route: str):
    """
    Get cached deals for a route (for debugging)
    Format: origin-destination for flights, city for hotels
    """
    try:
        # Try to determine type from route format
        if "-" in route:
            # Flight route
            cached = await cache_service.get_cached_deals(route, "Flight")
            if cached:
                return {"success": True, "cached": True, "deals": cached}
            
            # Fallback to SQLite
            parts = route.split("-")
            if len(parts) == 2:
                origin, destination = parts
                session = get_session()
                try:
                    deals = session.query(FlightDeal).filter(
                        FlightDeal.origin.ilike(f"%{origin}%"),
                        FlightDeal.destination.ilike(f"%{destination}%"),
                        FlightDeal.departure_date >= datetime.now()
                    ).order_by(FlightDeal.deal_score.desc()).limit(20).all()
                    
                    deals_dict = [cache_service._flight_deal_to_dict(d) for d in deals]
                    return {"success": True, "cached": False, "deals": deals_dict}
                finally:
                    session.close()
        else:
            # Hotel route (city)
            cached = await cache_service.get_cached_deals(route, "Hotel")
            if cached:
                return {"success": True, "cached": True, "deals": cached}
            
            # Fallback to SQLite
            session = get_session()
            try:
                deals = session.query(HotelDeal).filter(
                    HotelDeal.city.ilike(f"%{route}%"),
                    HotelDeal.check_in >= datetime.now()
                ).order_by(HotelDeal.deal_score.desc()).limit(20).all()
                
                deals_dict = [cache_service._hotel_deal_to_dict(d) for d in deals]
                return {"success": True, "cached": False, "deals": deals_dict}
            finally:
                session.close()
        
        return {"success": True, "cached": False, "deals": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


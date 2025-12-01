"""
POST /watch - Add watch thresholds for price/inventory alerts
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from src.services.watchlist_service import WatchlistService

router = APIRouter()
watchlist_service = WatchlistService()

class WatchRequest(BaseModel):
    listing_type: str  # "Flight" or "Hotel"
    listing_id: Optional[str] = None
    route: Optional[str] = None  # "origin-destination" for flights, "city" for hotels
    price_threshold: Optional[float] = None
    inventory_threshold: Optional[int] = None

class WatchResponse(BaseModel):
    success: bool
    watch_id: int
    message: str

@router.post("")
async def add_watch(
    request: WatchRequest,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Add a watchlist item for price/inventory alerts"""
    try:
        if not request.listing_id and not request.route:
            raise HTTPException(
                status_code=400,
                detail="Either listing_id or route must be provided"
            )
        
        watch = await watchlist_service.add_watch(
            user_id=user_id,
            listing_type=request.listing_type,
            listing_id=request.listing_id,
            route=request.route,
            price_threshold=request.price_threshold,
            inventory_threshold=request.inventory_threshold
        )
        
        return WatchResponse(
            success=True,
            watch_id=watch.id,
            message="Watchlist item added successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_watches(
    user_id: str = Header(..., alias="X-User-ID")
):
    """Get all active watches for a user"""
    try:
        watches = await watchlist_service.get_user_watches(user_id)
        return {
            "success": True,
            "watches": [
                {
                    "id": w.id,
                    "listing_type": w.listing_type.value,
                    "listing_id": w.listing_id,
                    "route": w.route,
                    "price_threshold": w.price_threshold,
                    "inventory_threshold": w.inventory_threshold,
                    "created_at": w.created_at.isoformat()
                }
                for w in watches
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{watch_id}")
async def remove_watch(
    watch_id: int,
    user_id: str = Header(..., alias="X-User-ID")
):
    """Remove a watchlist item"""
    try:
        success = await watchlist_service.remove_watch(watch_id, user_id)
        if success:
            return {"success": True, "message": "Watchlist item removed"}
        else:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


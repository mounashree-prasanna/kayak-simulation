from fastapi import APIRouter, HTTPException, Header
from src.models.bundle import BundleRequest, BundleResponse, BundleRecommendation
from src.services.concierge_agent import TripPlanner, ExplanationGenerator
from src.services.caching_service import CachingService
from datetime import datetime
from dateutil import parser
from typing import Optional

router = APIRouter()
trip_planner = TripPlanner()
explanation_gen = ExplanationGenerator()
cache_service = CachingService()

@router.post("", response_model=BundleResponse)
async def get_bundles(
    request: BundleRequest,
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """Get 2-3 best flight+hotel bundles with explanations"""
    try:
        import sys
        print(f"[Bundles Route] Request: {request.origin} -> {request.destination}, checkin: {request.checkin}, checkout: {request.checkout}", file=sys.stderr, flush=True)
        
        # Track search for popularity-based caching
        if user_id:
            route = f"{request.origin}-{request.destination}"
            await cache_service.track_search(user_id, route)
        
        # Build bundles
        bundles = await trip_planner.build_bundles(
            request.origin,
            request.destination,
            request.checkin,
            request.checkout,
            request.budget,
            request.constraints or {}
        )
        
        print(f"[Bundles Route] Built {len(bundles)} bundles", file=sys.stderr, flush=True)
        
        # Generate explanations for each bundle
        for bundle in bundles:
            bundle.why_this = await explanation_gen.generate_why_this(bundle)
            bundle.what_to_watch = await explanation_gen.generate_what_to_watch(bundle)
        
        if not bundles:
            print(f"[Bundles Route] No bundles found - returning empty response", file=sys.stderr, flush=True)
            return BundleResponse(
                success=False,
                bundles=[],
                message="No matching bundles found"
            )
        
        return BundleResponse(
            success=True,
            bundles=bundles,
            message=f"Found {len(bundles)} bundle(s)"
        )
    except Exception as e:
        import traceback
        print(f"[Bundles Route] Error: {e}", file=sys.stderr, flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


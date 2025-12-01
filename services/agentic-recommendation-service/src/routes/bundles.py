from fastapi import APIRouter, HTTPException
from src.models.bundle import BundleRequest, BundleResponse
from src.services.concierge_agent.trip_planner import TripPlanner

router = APIRouter()
trip_planner = TripPlanner()

@router.post("", response_model=BundleResponse)
async def get_bundles(request: BundleRequest):
    """Get flight+hotel bundle recommendations"""
    try:
        bundles = await trip_planner.build_bundles(
            origin=request.origin,
            destination=request.destination,
            check_in=request.checkin,
            check_out=request.checkout,
            budget=request.budget,
            constraints=request.constraints or {}
        )
        
        if not bundles:
            return BundleResponse(
                success=False,
                bundles=[],
                message="No matching bundles found"
            )
        
        # Ensure proper serialization by using model_dump
        response = BundleResponse(
            success=True,
            bundles=bundles,
            message=f"Found {len(bundles)} bundle(s)"
        )
        return response
    except Exception as e:
        import traceback
        print(f"[Bundles Route] Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


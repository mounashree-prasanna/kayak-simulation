from fastapi import APIRouter, HTTPException
from src.models.bundle import BundleRequest, BundleResponse
from src.services.concierge_agent import ConciergeAgent

router = APIRouter()
concierge_agent = ConciergeAgent()

@router.post("", response_model=BundleResponse)
async def get_bundles(request: BundleRequest):
    """Get flight+hotel bundle recommendations"""
    try:
        bundles = await concierge_agent.compose_bundles(request)
        
        if not bundles:
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
        raise HTTPException(status_code=500, detail=str(e))


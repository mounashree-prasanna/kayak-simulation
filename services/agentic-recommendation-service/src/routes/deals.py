from fastapi import APIRouter, HTTPException
from src.models.deal import DealModel
from src.services.deals_agent import DealsAgent

router = APIRouter()
deals_agent = DealsAgent()

@router.post("")
async def create_deal(deal: DealModel):
    """Create or update a deal (Deals Agent)"""
    try:
        scored_deal = await deals_agent.score_deal(deal)
        saved = await deals_agent.save_deal(scored_deal)
        
        return {
            "success": saved,
            "message": "Deal created" if saved else "Deal updated or already exists",
            "deal": scored_deal
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


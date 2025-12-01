from fastapi import APIRouter, HTTPException
from src.models.deal import DealModel
# Import from the file directly (not the package)
# Use importlib to import from the .py file, bypassing the package
import importlib.util
import os
import sys

# Get the path to deals_agent.py file
current_dir = os.path.dirname(os.path.abspath(__file__))
deals_agent_file = os.path.join(current_dir, '..', 'services', 'deals_agent.py')
deals_agent_file = os.path.abspath(deals_agent_file)

# Load the module from file
spec = importlib.util.spec_from_file_location("deals_agent_module", deals_agent_file)
deals_agent_module = importlib.util.module_from_spec(spec)
sys.modules["deals_agent_module"] = deals_agent_module
spec.loader.exec_module(deals_agent_module)

DealsAgent = deals_agent_module.DealsAgent

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


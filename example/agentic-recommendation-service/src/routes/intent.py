"""
POST /intent - Parse user query to structured intent
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from src.services.concierge_agent import IntentParser, Intent

router = APIRouter()
intent_parser = IntentParser()

class IntentRequest(BaseModel):
    query: str
    conversation_history: Optional[list] = None

class IntentResponse(BaseModel):
    success: bool
    intent: Intent
    message: Optional[str] = None

@router.post("", response_model=IntentResponse)
async def parse_intent(request: IntentRequest):
    """Parse natural language query to structured intent"""
    try:
        intent = await intent_parser.parse_intent(
            request.query,
            request.conversation_history
        )
        
        return IntentResponse(
            success=True,
            intent=intent,
            message=intent.clarification_question if intent.needs_clarification else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


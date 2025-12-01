from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ListingType(str, Enum):
    FLIGHT = "Flight"
    HOTEL = "Hotel"

class DealModel(BaseModel):
    _id: Optional[str] = None
    listing_type: ListingType
    listing_id: str
    date_range: Dict[str, datetime]
    base_price: float
    current_price: float
    avg_30d_price: Optional[float] = None
    deal_score: int = Field(ge=0, le=100)
    limited_availability: bool = False
    tags: Dict[str, Any] = Field(default_factory=dict)
    seats_or_rooms_left: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "listing_type": "Flight",
                "listing_id": "AA123",
                "date_range": {
                    "start": "2024-06-01T00:00:00",
                    "end": "2024-06-05T00:00:00"
                },
                "base_price": 500.0,
                "current_price": 425.0,
                "avg_30d_price": 500.0,
                "deal_score": 85,
                "limited_availability": True,
                "tags": {
                    "refundability": True,
                    "pet_friendly": False
                },
                "seats_or_rooms_left": 3
            }
        }


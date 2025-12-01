from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class FlightBundle(BaseModel):
    flight_id: str
    airline: str
    price: float
    departure: datetime
    arrival: datetime

class HotelBundle(BaseModel):
    hotel_id: str
    name: str
    price_per_night: float
    total_nights: int
    total_price: float
    amenities: dict

class BundleRecommendation(BaseModel):
    flight: FlightBundle
    hotel: HotelBundle
    total_price: float
    fit_score: float = Field(ge=0, le=100)
    why_this: str = Field(max_length=250, default="")
    what_to_watch: str = Field(max_length=120, default="")

class BundleRequest(BaseModel):
    origin: str
    destination: str
    checkin: datetime
    checkout: datetime
    budget: float
    constraints: Optional[dict] = Field(default_factory=dict)

class BundleResponse(BaseModel):
    success: bool
    bundles: List[BundleRecommendation]
    message: Optional[str] = None


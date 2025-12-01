from sqlmodel import SQLModel, create_engine, Session, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import os

# SQLite database path - use /app/data/deals.db in Docker, ./deals.db locally
if os.getenv("SQLITE_DATABASE_URL"):
    DATABASE_URL = os.getenv("SQLITE_DATABASE_URL")
else:
    # Default: use data directory if it exists, otherwise current directory
    if os.path.exists("/app/data"):
        DATABASE_URL = "sqlite:////app/data/deals.db"
    else:
        DATABASE_URL = "sqlite:///./deals.db"

engine = create_engine(DATABASE_URL, echo=False)

class ListingType(str, Enum):
    FLIGHT = "Flight"
    HOTEL = "Hotel"

class HotelDeal(SQLModel, table=True):
    __tablename__ = "hotel_deals"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str = Field(index=True)
    hotel_name: Optional[str] = None
    city: Optional[str] = None
    check_in: datetime
    check_out: datetime
    base_price: float
    current_price: float
    avg_30d_price: Optional[float] = None
    deal_score: int = Field(default=0, ge=0, le=100)
    rooms_left: Optional[int] = None
    limited_availability: bool = False
    
    # Tags
    pet_friendly: bool = False
    near_transit: bool = False
    breakfast: bool = False
    refundable: bool = False
    parking: bool = False
    
    # Metadata
    amenities: Optional[str] = None  # JSON string
    cancellation_window: Optional[int] = None  # days
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class FlightDeal(SQLModel, table=True):
    __tablename__ = "flight_deals"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str = Field(index=True)
    airline: Optional[str] = None
    origin: str
    destination: str
    departure_date: datetime
    arrival_date: datetime
    base_price: float
    current_price: float
    avg_30d_price: Optional[float] = None
    deal_score: int = Field(default=0, ge=0, le=100)
    seats_left: Optional[int] = None
    limited_availability: bool = False
    
    # Tags
    refundable: bool = False
    avoid_red_eye: bool = False  # True if departure is not late night/early morning
    
    # Metadata
    flight_class: Optional[str] = None  # Economy, Business, First
    duration_minutes: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class Watchlist(SQLModel, table=True):
    __tablename__ = "watchlist"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    listing_type: ListingType
    listing_id: Optional[str] = None
    route: Optional[str] = None  # Format: "origin-destination" for flights, "city" for hotels
    price_threshold: Optional[float] = None
    inventory_threshold: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)
    active: bool = True

def init_db():
    """Initialize SQLite database and create tables"""
    try:
        # Ensure data directory exists
        db_path = DATABASE_URL.replace("sqlite:///", "")
        # Handle both absolute and relative paths
        if db_path.startswith("/"):
            # Absolute path
            db_dir = os.path.dirname(db_path)
        elif db_path.startswith("./"):
            # Relative path like ./deals.db
            db_path = db_path[2:]  # Remove ./
            db_dir = os.path.dirname(db_path) if os.path.dirname(db_path) else None
        else:
            # Relative path like deals.db
            db_dir = os.path.dirname(db_path) if os.path.dirname(db_path) else None
        
        if db_dir and db_dir != "." and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            print(f"[SQLite] Created directory: {db_dir}")
        
        SQLModel.metadata.create_all(engine)
        print(f"[SQLite] Database initialized at: {DATABASE_URL}")
    except Exception as e:
        print(f"[SQLite] Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        raise

def get_session():
    """Get database session"""
    return Session(engine)


"""
Trip Planner: Build flight + hotel bundles with FitScore
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dateutil import parser
import os
import httpx
from src.services.caching_service import CachingService
from src.database_sqlite import get_session, HotelDeal, FlightDeal
from src.models.bundle import BundleRecommendation, FlightBundle, HotelBundle

class TripPlanner:
    def __init__(self):
        self.cache = CachingService()
        # Listing service URL for fallback when no deals in database
        self.listing_service_url = os.getenv("LISTING_SERVICE_URL", "http://listing-service:3002")
    
    async def find_deals(
        self,
        origin: str,
        destination: str,
        check_in: datetime,
        check_out: datetime,
        listing_type: str = "Flight"
    ) -> tuple[List[Dict], List[Dict]]:
        """Find flight and hotel deals, using cache first"""
        route = f"{origin}-{destination}"
        
        # Try cache first
        cached_flights = await self.cache.get_cached_deals(route, "Flight")
        cached_hotels = await self.cache.get_cached_deals(destination, "Hotel")
        
        print(f"[Trip Planner] Cache check: {len(cached_flights) if cached_flights else 0} flights, {len(cached_hotels) if cached_hotels else 0} hotels")
        
        if cached_flights and cached_hotels:
            print(f"[Trip Planner] Using cached deals")
            return cached_flights, cached_hotels
        
        # Fallback to SQLite
        session = get_session()
        try:
            # Get flight deals
            flight_deals = session.query(FlightDeal).filter(
                FlightDeal.origin.ilike(f"%{origin}%"),
                FlightDeal.destination.ilike(f"%{destination}%"),
                FlightDeal.departure_date >= check_in - timedelta(days=1),
                FlightDeal.departure_date <= check_in + timedelta(days=1)
            ).order_by(FlightDeal.deal_score.desc()).limit(10).all()
            
            # Get hotel deals
            hotel_deals = session.query(HotelDeal).filter(
                HotelDeal.city.ilike(f"%{destination}%"),
                HotelDeal.check_in <= check_in + timedelta(days=1),
                HotelDeal.check_out >= check_out - timedelta(days=1)
            ).order_by(HotelDeal.deal_score.desc()).limit(10).all()
            
            # Convert to dicts
            flights = [self._flight_to_dict(f) for f in flight_deals]
            hotels = [self._hotel_to_dict(h) for h in hotel_deals]
            
            print(f"[Trip Planner] SQLite query results: {len(flights)} flights, {len(hotels)} hotels", flush=True)
            
            # If no deals found in SQLite, try listing service as fallback
            # Trigger fallback if either flights or hotels are missing
            if not flights or not hotels:
                print(f"[Trip Planner] No deals in database (flights={len(flights)}, hotels={len(hotels)}), trying listing service fallback...", flush=True)
                try:
                    fallback_flights, fallback_hotels = await self._fetch_from_listing_service(
                        origin, destination, check_in, check_out
                    )
                    print(f"[Trip Planner] Fallback results: {len(fallback_flights)} flights, {len(fallback_hotels)} hotels", flush=True)
                    # Use fallback data if we don't have it from SQLite
                    if not flights and fallback_flights:
                        flights = fallback_flights
                        print(f"[Trip Planner] Using {len(flights)} flights from listing service", flush=True)
                    if not hotels and fallback_hotels:
                        hotels = fallback_hotels
                        print(f"[Trip Planner] Using {len(hotels)} hotels from listing service", flush=True)
                except Exception as e:
                    print(f"[Trip Planner] Listing service fallback failed: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
            
            # Cache results
            if flights:
                await self.cache.cache_deals(route, "Flight", flights)
            if hotels:
                await self.cache.cache_deals(destination, "Hotel", hotels)
            
            return flights, hotels
        finally:
            session.close()
    
    async def _fetch_from_listing_service(
        self,
        origin: str,
        destination: str,
        check_in: datetime,
        check_out: datetime
    ) -> tuple[List[Dict], List[Dict]]:
        """Fallback to listing service when no deals in database"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            flights = []
            hotels = []
            
            try:
                # Fetch flights
                # Try both airport codes and city names
                flight_params = {
                    "origin": origin,
                    "destination": destination,
                    "date": check_in.strftime("%Y-%m-%d")
                }
                print(f"[Trip Planner] Fetching flights: {flight_params}", flush=True)
                flight_response = await client.get(
                    f"{self.listing_service_url}/flights/search",
                    params=flight_params
                )
                print(f"[Trip Planner] Flight response status: {flight_response.status_code}, body length: {len(flight_response.text)}", flush=True)
                
                if flight_response.status_code == 200:
                    flight_data = flight_response.json()
                    # Handle different response formats
                    flight_list = []
                    if isinstance(flight_data, list):
                        flight_list = flight_data
                    elif flight_data.get("success") and flight_data.get("flights"):
                        flight_list = flight_data["flights"]
                    elif flight_data.get("data"):
                        flight_list = flight_data["data"]
                    
                    for flight in flight_list[:10]:
                        # Handle different field names
                        flight_id = flight.get("flight_id") or flight.get("_id") or flight.get("id", "")
                        airline = flight.get("airline_name") or flight.get("airline", "")
                        dep_time = flight.get("departure_datetime") or flight.get("departure_time") or flight.get("departure")
                        arr_time = flight.get("arrival_datetime") or flight.get("arrival_time") or flight.get("arrival")
                        price = float(flight.get("ticket_price") or flight.get("price") or 0)
                        seats = flight.get("total_available_seats") or flight.get("available_seats") or flight.get("seats", 0)
                        
                        flights.append({
                            "listing_id": str(flight_id),
                            "airline": airline,
                            "origin": flight.get("departure_airport") or flight.get("origin", origin),
                            "destination": flight.get("arrival_airport") or flight.get("destination", destination),
                            "departure_date": parser.parse(dep_time) if dep_time else check_in,
                            "arrival_date": parser.parse(arr_time) if arr_time else check_in,
                            "current_price": price,
                            "base_price": price,
                            "deal_score": 50,  # Default score
                            "seats_left": int(seats),
                            "limited_availability": int(seats) < 5,
                            "refundable": flight.get("refundable", False),
                            "avoid_red_eye": False,
                            "flight_class": flight.get("flight_class") or flight.get("class", "Economy"),
                            "duration_minutes": flight.get("duration_minutes", 0)
                        })
            except Exception as e:
                print(f"[Trip Planner] Error fetching flights from listing service: {e}")
            
            try:
                # Fetch hotels
                # Map airport codes to cities for hotel search
                city_map = {
                    "LAX": "Los Angeles", "JFK": "New York", "LGA": "New York", "EWR": "New York",
                    "NYC": "New York", "SFO": "San Francisco", "SEA": "Seattle", "DEN": "Denver",
                    "MIA": "Miami", "BOS": "Boston", "ORD": "Chicago", "DFW": "Dallas"
                }
                hotel_city = city_map.get(destination.upper(), destination)
                hotel_params = {
                    "city": hotel_city
                }
                print(f"[Trip Planner] Fetching hotels: {hotel_params}", flush=True)
                hotel_response = await client.get(
                    f"{self.listing_service_url}/hotels/search",
                    params=hotel_params
                )
                print(f"[Trip Planner] Hotel response status: {hotel_response.status_code}, body length: {len(hotel_response.text)}", flush=True)
                
                if hotel_response.status_code == 200:
                    hotel_data = hotel_response.json()
                    # Handle different response formats
                    hotel_list = []
                    if isinstance(hotel_data, list):
                        hotel_list = hotel_data
                    elif hotel_data.get("success") and hotel_data.get("hotels"):
                        hotel_list = hotel_data["hotels"]
                    elif hotel_data.get("data"):
                        hotel_list = hotel_data["data"]
                    
                    for hotel in hotel_list[:10]:
                        nights = (check_out - check_in).days or 1
                        # Handle different field names
                        hotel_id = hotel.get("hotel_id") or hotel.get("_id") or hotel.get("id", "")
                        hotel_name = hotel.get("hotel_name") or hotel.get("name", "")
                        # City can be in address.city or city field
                        city = hotel.get("address", {}).get("city") or hotel.get("city", destination)
                        price_per_night = float(hotel.get("price_per_night") or hotel.get("price") or 0)
                        rooms = hotel.get("number_of_rooms") or hotel.get("total_available_rooms") or hotel.get("available_rooms") or hotel.get("rooms", 0)
                        amenities = hotel.get("amenities") or {}
                        
                        hotels.append({
                            "listing_id": str(hotel_id),
                            "hotel_name": hotel_name,
                            "city": city,
                            "check_in": check_in,
                            "check_out": check_out,
                            "current_price": price_per_night * nights,
                            "base_price": price_per_night * nights,
                            "deal_score": 50,  # Default score
                            "rooms_left": int(rooms),
                            "limited_availability": int(rooms) < 3,
                            "pet_friendly": amenities.get("pet_friendly") or hotel.get("pet_friendly", False),
                            "near_transit": amenities.get("near_transit") or hotel.get("near_transit", False),
                            "breakfast": amenities.get("breakfast_included") or amenities.get("breakfast") or hotel.get("breakfast", False),
                            "refundable": hotel.get("refundable", False),
                            "parking": amenities.get("parking") or hotel.get("parking", False),
                            "cancellation_window": hotel.get("cancellation_window", 0)
                        })
            except Exception as e:
                print(f"[Trip Planner] Error fetching hotels from listing service: {e}")
            
            return flights, hotels
    
    def _flight_to_dict(self, deal: FlightDeal) -> Dict:
        """Convert FlightDeal to dict"""
        return {
            "listing_id": deal.listing_id,
            "airline": deal.airline,
            "origin": deal.origin,
            "destination": deal.destination,
            "departure_date": deal.departure_date,
            "arrival_date": deal.arrival_date,
            "current_price": deal.current_price,
            "base_price": deal.base_price,
            "deal_score": deal.deal_score,
            "seats_left": deal.seats_left,
            "limited_availability": deal.limited_availability,
            "refundable": deal.refundable,
            "avoid_red_eye": deal.avoid_red_eye,
            "flight_class": deal.flight_class,
            "duration_minutes": deal.duration_minutes
        }
    
    def _hotel_to_dict(self, deal: HotelDeal) -> Dict:
        """Convert HotelDeal to dict"""
        return {
            "listing_id": deal.listing_id,
            "hotel_name": deal.hotel_name,
            "city": deal.city,
            "check_in": deal.check_in,
            "check_out": deal.check_out,
            "current_price": deal.current_price,
            "base_price": deal.base_price,
            "deal_score": deal.deal_score,
            "rooms_left": deal.rooms_left,
            "limited_availability": deal.limited_availability,
            "pet_friendly": deal.pet_friendly,
            "near_transit": deal.near_transit,
            "breakfast": deal.breakfast,
            "refundable": deal.refundable,
            "parking": deal.parking,
            "cancellation_window": deal.cancellation_window
        }
    
    def compute_fit_score(
        self,
        flight_deal: Dict,
        hotel_deal: Dict,
        budget: float,
        constraints: Dict[str, Any],
        destination: str = ""
    ) -> float:
        """
        Compute FitScore (0-100) using:
        - price vs budget (40 points)
        - price vs median (20 points)
        - amenity/policy match (30 points)
        - simple location flag (10 points)
        """
        score = 0.0
        
        total_price = flight_deal.get("current_price", 0) + hotel_deal.get("current_price", 0)
        
        # Price vs budget (40 points)
        if budget and budget > 0:
            price_ratio = total_price / budget
            if price_ratio <= 0.8:
                score += 40
            elif price_ratio <= 0.95:
                score += 30
            elif price_ratio <= 1.0:
                score += 20
            elif price_ratio <= 1.1:
                score += 10
        
        # Price vs median (20 points) - using base_price as proxy
        flight_median = flight_deal.get("base_price", 0)
        hotel_median = hotel_deal.get("base_price", 0)
        if flight_median > 0 and hotel_median > 0:
            flight_discount = (flight_median - flight_deal.get("current_price", 0)) / flight_median
            hotel_discount = (hotel_median - hotel_deal.get("current_price", 0)) / hotel_median
            avg_discount = (flight_discount + hotel_discount) / 2
            
            if avg_discount >= 0.15:
                score += 20
            elif avg_discount >= 0.10:
                score += 15
            elif avg_discount >= 0.05:
                score += 10
        
        # Amenity/policy match (30 points)
        if constraints.get("pet_friendly") and hotel_deal.get("pet_friendly"):
            score += 10
        if constraints.get("breakfast") and hotel_deal.get("breakfast"):
            score += 10
        if constraints.get("near_transit") and hotel_deal.get("near_transit"):
            score += 5
        if constraints.get("refundable"):
            if flight_deal.get("refundable") or hotel_deal.get("refundable"):
                score += 5
        if constraints.get("avoid_red_eye") and flight_deal.get("avoid_red_eye"):
            score += 5
        
        # Location flag (10 points) - simple check if city matches
        if destination and hotel_deal.get("city"):
            if destination.lower() in hotel_deal.get("city", "").lower():
                score += 10
        elif hotel_deal.get("city"):
            score += 5  # Partial location match
        
        return min(100.0, score)
    
    async def build_bundles(
        self,
        origin: str,
        destination: str,
        check_in: datetime,
        check_out: datetime,
        budget: float,
        constraints: Dict[str, Any]
    ) -> List[BundleRecommendation]:
        """Build 2-3 best bundles"""
        flights, hotels = await self.find_deals(origin, destination, check_in, check_out)
        
        print(f"[Trip Planner] Found {len(flights)} flights and {len(hotels)} hotels for {origin} -> {destination}", flush=True)
        
        if not flights:
            print(f"[Trip Planner] No flights found for {origin} -> {destination}", flush=True)
        if not hotels:
            print(f"[Trip Planner] No hotels found for {destination}", flush=True)
        
        bundles = []
        
        # Combine top deals
        for flight in flights[:3]:
            for hotel in hotels[:3]:
                if len(bundles) >= 3:
                    break
                
                fit_score = self.compute_fit_score(flight, hotel, budget, constraints, destination)
                
                # Calculate nights
                nights = (check_out - check_in).days
                if nights <= 0:
                    nights = 1
                
                bundle = BundleRecommendation(
                    flight=FlightBundle(
                        flight_id=flight.get("listing_id", ""),
                        airline=flight.get("airline", ""),
                        price=flight.get("current_price", 0),
                        departure=flight.get("departure_date"),
                        arrival=flight.get("arrival_date")
                    ),
                    hotel=HotelBundle(
                        hotel_id=hotel.get("listing_id", ""),
                        name=hotel.get("hotel_name", ""),
                        price_per_night=hotel.get("current_price", 0) / nights if nights > 0 else hotel.get("current_price", 0),
                        total_nights=nights,
                        total_price=hotel.get("current_price", 0),
                        amenities={
                            "pet_friendly": hotel.get("pet_friendly", False),
                            "breakfast": hotel.get("breakfast", False),
                            "near_transit": hotel.get("near_transit", False),
                            "refundable": hotel.get("refundable", False),
                            "parking": hotel.get("parking", False)
                        }
                    ),
                    total_price=flight.get("current_price", 0) + hotel.get("current_price", 0),
                    fit_score=fit_score,
                    why_this="",  # Will be generated by explanation service
                    what_to_watch=""  # Will be generated by explanation service
                )
                
                bundles.append(bundle)
        
        # Sort by fit score
        bundles.sort(key=lambda x: x.fit_score, reverse=True)
        
        print(f"[Trip Planner] Built {len(bundles)} bundles", flush=True)
        return bundles[:3]


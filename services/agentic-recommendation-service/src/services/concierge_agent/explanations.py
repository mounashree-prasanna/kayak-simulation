"""
Generate explanations using OpenAI (factual metadata only)
"""
from typing import Dict, Any
from src.config.openai_config import get_openai_client
from src.models.bundle import BundleRecommendation

class ExplanationGenerator:
    def __init__(self):
        try:
            self.client = get_openai_client()
        except Exception as e:
            print(f"[ExplanationGenerator] Error initializing OpenAI client: {e}")
            self.client = None
    
    async def generate_why_this(self, bundle: BundleRecommendation) -> str:
        """
        Generate "Why this" explanation (max 25 words)
        Uses only factual metadata from datasets
        """
        if not self.client:
            return self._simple_why_this(bundle)
        
        try:
            flight_info = f"Flight: {bundle.flight.airline}, ${bundle.flight.price}, {bundle.flight.departure}"
            hotel_info = f"Hotel: {bundle.hotel.name}, ${bundle.hotel.total_price} for {bundle.hotel.total_nights} nights"
            amenities = ", ".join([k for k, v in bundle.hotel.amenities.items() if v])
            
            prompt = f"""Given this travel bundle:
{flight_info}
{hotel_info}
Amenities: {amenities}
Total: ${bundle.total_price}, Fit Score: {bundle.fit_score}

Generate a concise "why this" explanation (max 25 words) using ONLY factual metadata. Focus on value, deal quality, and included amenities. Be factual, no marketing fluff."""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.5
            )
            
            explanation = response.choices[0].message.content.strip()
            # Ensure max 25 words
            words = explanation.split()
            if len(words) > 25:
                explanation = " ".join(words[:25])
            
            return explanation
            
        except Exception as e:
            print(f"[Explanations] OpenAI error: {e}")
            return self._simple_why_this(bundle)
    
    def _simple_why_this(self, bundle: BundleRecommendation) -> str:
        """Simple fallback explanation"""
        reasons = []
        if bundle.fit_score > 80:
            reasons.append("Excellent value")
        if bundle.flight.price < bundle.hotel.total_price * 0.5:
            reasons.append("great flight deal")
        if bundle.hotel.amenities.get("breakfast"):
            reasons.append("breakfast included")
        if bundle.hotel.amenities.get("pet_friendly"):
            reasons.append("pet-friendly")
        
        if not reasons:
            reasons.append("Good combination")
        
        return " ".join(reasons[:5])
    
    async def generate_what_to_watch(self, bundle: BundleRecommendation) -> str:
        """
        Generate "What to watch" warning (max 12 words)
        Uses only factual metadata
        """
        if not self.client:
            return self._simple_what_to_watch(bundle)
        
        try:
            warnings_data = []
            if bundle.flight.price < 100:  # Very cheap might indicate restrictions
                warnings_data.append("Flight may have restrictions")
            if not bundle.hotel.amenities.get("refundable"):
                warnings_data.append("Non-refundable hotel")
            if bundle.hotel.total_nights > 7:
                warnings_data.append("Long stay")
            
            prompt = f"""Given this travel bundle with potential concerns:
{', '.join(warnings_data) if warnings_data else 'No major concerns'}

Generate a concise "what to watch" warning (max 12 words) using ONLY factual metadata. Be direct and helpful."""

            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=30,
                temperature=0.3
            )
            
            warning = response.choices[0].message.content.strip()
            # Ensure max 12 words
            words = warning.split()
            if len(words) > 12:
                warning = " ".join(words[:12])
            
            return warning
            
        except Exception as e:
            print(f"[Explanations] OpenAI error: {e}")
            return self._simple_what_to_watch(bundle)
    
    def _simple_what_to_watch(self, bundle: BundleRecommendation) -> str:
        """Simple fallback warning"""
        warnings = []
        if not bundle.hotel.amenities.get("refundable"):
            warnings.append("Non-refundable")
        if bundle.hotel.total_price > bundle.flight.price * 2:
            warnings.append("Hotel pricey")
        
        if not warnings:
            warnings.append("Book soon")
        
        return " ".join(warnings[:3])
    
    async def answer_policy_question(self, question: str, listing_type: str, listing_id: str) -> str:
        """
        Answer policy questions from dataset fields
        Questions about: refundable, pets allowed, parking, cancellation window
        """
        # Fetch deal from SQLite
        from src.database_sqlite import get_session, HotelDeal, FlightDeal
        
        session = get_session()
        try:
            if listing_type == "Hotel":
                deal = session.query(HotelDeal).filter(HotelDeal.listing_id == listing_id).first()
                if deal:
                    policy_data = {
                        "refundable": deal.refundable,
                        "pets_allowed": deal.pet_friendly,
                        "parking": deal.parking,
                        "cancellation_window": deal.cancellation_window,
                        "breakfast": deal.breakfast
                    }
                else:
                    return "Listing not found"
            else:
                deal = session.query(FlightDeal).filter(FlightDeal.listing_id == listing_id).first()
                if deal:
                    policy_data = {
                        "refundable": deal.refundable,
                        "avoid_red_eye": deal.avoid_red_eye,
                        "flight_class": deal.flight_class
                    }
                else:
                    return "Listing not found"
            
            # Use OpenAI to answer question based on policy data
            if self.client:
                prompt = f"""User asked: {question}

Available policy data: {policy_data}

Answer the question using ONLY the provided policy data. Be concise (max 30 words). If information is not available, say so."""
                
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=60,
                    temperature=0.3
                )
                
                return response.choices[0].message.content.strip()
            else:
                # Simple fallback
                if "refund" in question.lower():
                    return f"Refundable: {policy_data.get('refundable', False)}"
                elif "pet" in question.lower():
                    return f"Pets allowed: {policy_data.get('pets_allowed', False)}"
                elif "parking" in question.lower():
                    return f"Parking available: {policy_data.get('parking', False)}"
                elif "cancel" in question.lower():
                    return f"Cancellation window: {policy_data.get('cancellation_window', 'N/A')} days"
                else:
                    return "Please ask about refundable, pets, parking, or cancellation."
        finally:
            session.close()


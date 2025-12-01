"""
Intent Understanding using OpenAI API
"""
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from src.config.openai_config import get_openai_client

# Try to import dateutil, fallback to basic parsing if not available
try:
    from dateutil import parser as date_parser
    HAS_DATEUTIL = True
except ImportError:
    HAS_DATEUTIL = False

class Intent(BaseModel):
    """Parsed user intent"""
    origin: Optional[str] = None
    destination: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    budget: Optional[float] = None
    constraints: Dict[str, Any] = Field(default_factory=dict)
    needs_clarification: bool = False
    clarification_question: Optional[str] = None

class IntentParser:
    def __init__(self):
        try:
            self.client = get_openai_client()
        except Exception as e:
            print(f"[IntentParser] Error initializing OpenAI client: {e}")
            self.client = None
    
    async def parse_intent(self, user_query: str, conversation_history: list = None) -> Intent:
        """
        Parse user query to extract intent using OpenAI
        
        Returns Intent with extracted fields or clarification question
        """
        if not self.client:
            # Fallback to simple parsing if OpenAI not configured
            print("[IntentParser] OpenAI client not available, using simple parsing")
            return self._simple_parse(user_query, conversation_history)
        
        print(f"[IntentParser] Using OpenAI client for parsing")
        
        try:
            system_prompt = """You are a travel assistant. Parse user queries to extract travel information.

EXTRACT THESE FIELDS:
- origin: departure city/airport (e.g., "SFO" → "San Francisco", "NYC" → "New York", "LAX" → "Los Angeles")
- destination: arrival city/airport (same mapping)
- check_in: departure date in YYYY-MM-DD format (e.g., "Dec 25th" → "2024-12-25", "on Dec 25th" → "2024-12-25")
- check_out: return date in YYYY-MM-DD format (default to check_in + 3 days if not specified)
- budget: numeric value in USD
- constraints: object with pet_friendly, breakfast, near_transit, refundable, avoid_red_eye (boolean values)

CRITICAL RULES:
1. ALWAYS check conversation_history to fill missing fields from previous messages
2. If user says "I want to go to NYC" then later says "SFO to NYC on Dec 25th", combine them:
   - origin from current query: "San Francisco" (from "SFO")
   - destination from history: "New York" (from "NYC" in previous message)
   - check_in from current query: "2024-12-25" (from "Dec 25th")
3. Airport code mapping: SFO=San Francisco, NYC/JFK/LGA=New York, LAX=Los Angeles, ORD=Chicago, etc.
4. Date parsing: "Dec 25th" = "2024-12-25", "March 15" = "2024-03-15", use 2024 as default year
5. If user provides "SFO to NYC", extract origin="San Francisco", destination="New York"
6. If user provides "on Dec 25th", extract check_in="2024-12-25"
7. ONLY set needs_clarification=true if you absolutely cannot extract origin AND destination AND check_in even after checking conversation history

Return a JSON object with these exact fields: origin, destination, check_in, check_out, budget, constraints, needs_clarification, clarification_question."""
            
            # Build messages with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            if conversation_history and len(conversation_history) > 0:
                # Add conversation history
                messages.extend(conversation_history)
            
            # Add current user query
            messages.append({"role": "user", "content": user_query})
            
            # Debug: print what we're sending
            print(f"[IntentParser] Query: {user_query}")
            print(f"[IntentParser] History length: {len(conversation_history) if conversation_history else 0}")
            
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Use cheaper model for parsing
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2  # Lower temperature for more consistent parsing
            )
            
            import json
            
            parsed = json.loads(response.choices[0].message.content)
            
            # Process dates - convert natural language to ISO format
            check_in = parsed.get("check_in") or parsed.get("departure_date")
            check_out = parsed.get("check_out") or parsed.get("return_date")
            
            # If dates are in natural language, try to parse them
            if check_in and not check_in.startswith("202"):
                try:
                    if HAS_DATEUTIL:
                        parsed_date = date_parser.parse(check_in, default=datetime.now())
                        check_in = parsed_date.strftime("%Y-%m-%d")
                    else:
                        # Basic parsing without dateutil
                        import re
                        # Try to extract month and day
                        month_map = {
                            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                        }
                        check_in_lower = check_in.lower()
                        for month_name, month_num in month_map.items():
                            if month_name in check_in_lower:
                                day_match = re.search(r'(\d+)', check_in)
                                if day_match:
                                    day = int(day_match.group(1))
                                    now = datetime.now()
                                    check_in = f"{now.year}-{month_num:02d}-{day:02d}"
                                    break
                except Exception as e:
                    print(f"[IntentParser] Date parsing error for check_in '{check_in}': {e}")
            
            if check_out and not check_out.startswith("202"):
                try:
                    if HAS_DATEUTIL:
                        parsed_date = date_parser.parse(check_out, default=datetime.now())
                        check_out = parsed_date.strftime("%Y-%m-%d")
                    else:
                        # Basic parsing without dateutil
                        import re
                        month_map = {
                            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                        }
                        check_out_lower = check_out.lower()
                        for month_name, month_num in month_map.items():
                            if month_name in check_out_lower:
                                day_match = re.search(r'(\d+)', check_out)
                                if day_match:
                                    day = int(day_match.group(1))
                                    now = datetime.now()
                                    check_out = f"{now.year}-{month_num:02d}-{day:02d}"
                                    break
                except Exception as e:
                    print(f"[IntentParser] Date parsing error for check_out '{check_out}': {e}")
            
            # Normalize origin/destination (handle airport codes and city names)
            origin = parsed.get("origin")
            destination = parsed.get("destination")
            
            # Map common airport codes to city names
            airport_map = {
                "SFO": "San Francisco", "NYC": "New York", "LAX": "Los Angeles",
                "JFK": "New York", "LGA": "New York", "EWR": "New York",
                "ORD": "Chicago", "DFW": "Dallas", "DEN": "Denver",
                "SEA": "Seattle", "BOS": "Boston", "MIA": "Miami"
            }
            
            if origin and origin.upper() in airport_map:
                origin = airport_map[origin.upper()]
            if destination and destination.upper() in airport_map:
                destination = airport_map[destination.upper()]
            
            intent = Intent(
                origin=origin,
                destination=destination,
                check_in=check_in,
                check_out=check_out,
                budget=parsed.get("budget"),
                constraints=parsed.get("constraints", {}),
                needs_clarification=parsed.get("needs_clarification", False),
                clarification_question=parsed.get("clarification_question")
            )
            
            return intent
            
        except Exception as e:
            print(f"[Intent Parser] OpenAI error: {e}, falling back to simple parsing")
            import traceback
            traceback.print_exc()
            return self._simple_parse(user_query, conversation_history)
    
    def _simple_parse(self, query: str, conversation_history: list = None) -> Intent:
        """Simple fallback parsing without OpenAI"""
        import re
        from datetime import datetime, timedelta
        
        print(f"[SimpleParser] Parsing query: {query}")
        query_lower = query.lower()
        
        # Extract constraints
        constraints = {}
        if "pet" in query_lower or "dog" in query_lower:
            constraints["pet_friendly"] = True
        if "breakfast" in query_lower:
            constraints["breakfast"] = True
        if "transit" in query_lower or "metro" in query_lower:
            constraints["near_transit"] = True
        if "refund" in query_lower:
            constraints["refundable"] = True
        if "red eye" in query_lower or "redeye" in query_lower:
            constraints["avoid_red_eye"] = True
        
        # Extract budget (simple pattern)
        budget_match = re.search(r'\$?(\d+)', query)
        budget = float(budget_match.group(1)) if budget_match else None
        
        # Airport code to city mapping
        airport_map = {
            "sfo": "San Francisco", "nyc": "New York", "jfk": "New York", "lga": "New York", "ewr": "New York",
            "lax": "Los Angeles", "ord": "Chicago", "dfw": "Dallas", "den": "Denver",
            "sea": "Seattle", "bos": "Boston", "mia": "Miami", "atl": "Atlanta"
        }
        
        # Extract origin and destination
        origin = None
        destination = None
        
        # Pattern: "SFO to NYC" or "from SFO to NYC" or "SFO - NYC" or "SFO to NYC on..."
        to_pattern = re.search(r'(?:from\s+)?([A-Z]{3})\s+(?:to|-)\s+([A-Z]{3})', query, re.IGNORECASE)
        if to_pattern:
            origin_code = to_pattern.group(1).upper()
            dest_code = to_pattern.group(2).upper()
            origin = airport_map.get(origin_code.lower(), origin_code)
            destination = airport_map.get(dest_code.lower(), dest_code)
            print(f"[SimpleParser] Found via 'to' pattern: origin={origin}, destination={destination}")
        else:
            # Try to find airport codes individually (case-insensitive)
            codes = re.findall(r'\b([A-Z]{3})\b', query, re.IGNORECASE)
            print(f"[SimpleParser] Found codes: {codes}")
            if len(codes) >= 2:
                origin = airport_map.get(codes[0].lower(), codes[0])
                destination = airport_map.get(codes[1].lower(), codes[1])
                print(f"[SimpleParser] Using first two codes: origin={origin}, destination={destination}")
            elif len(codes) == 1:
                # Check conversation history for the other code
                if conversation_history:
                    for msg in conversation_history:
                        if msg.get("role") == "user":
                            hist_content = msg.get("content", "").lower()
                            if "nyc" in hist_content or "new york" in hist_content:
                                destination = "New York"
                                origin = airport_map.get(codes[0].lower(), codes[0])
                                print(f"[SimpleParser] Found destination from history: origin={origin}, destination={destination}")
                                break
                            hist_codes = re.findall(r'\b([A-Z]{3})\b', msg.get("content", ""), re.IGNORECASE)
                            if hist_codes and codes[0].lower() != hist_codes[0].lower():
                                origin = airport_map.get(codes[0].lower(), codes[0])
                                destination = airport_map.get(hist_codes[0].lower(), hist_codes[0])
                                print(f"[SimpleParser] Found from history codes: origin={origin}, destination={destination}")
                                break
        
        # Extract dates
        check_in = None
        check_out = None
        
        # Month mapping
        month_map = {
            'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
            'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
            'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
            'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
        }
        
        # Pattern: "Dec 25th", "December 25", "on Dec 25th"
        date_pattern = re.search(r'(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d+)(?:st|nd|rd|th)?', query_lower)
        if date_pattern:
            month_name = date_pattern.group(1)
            day = int(date_pattern.group(2))
            month_num = month_map.get(month_name, 12)
            now = datetime.now()
            check_in = f"{now.year}-{month_num:02d}-{day:02d}"
            # Default check_out to 3 days later
            check_out_date = datetime.strptime(check_in, "%Y-%m-%d") + timedelta(days=3)
            check_out = check_out_date.strftime("%Y-%m-%d")
            print(f"[SimpleParser] Found date: check_in={check_in}, check_out={check_out}")
        
        # Check if we have enough info
        needs_clarification = not (origin and destination and check_in)
        
        if needs_clarification:
            if not destination:
                clarification = "I need to know where you'd like to go! Please tell me your destination."
            elif not origin:
                clarification = f"Great! You want to go to {destination}. Where will you be traveling from?"
            elif not check_in:
                clarification = f"Perfect! {origin} to {destination}. When would you like to travel? Please provide a date."
            else:
                clarification = "Please provide origin, destination, and dates."
        else:
            clarification = None
        
        result = Intent(
            origin=origin,
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            budget=budget,
            constraints=constraints,
            needs_clarification=needs_clarification,
            clarification_question=clarification
        )
        print(f"[SimpleParser] Result: origin={origin}, destination={destination}, check_in={check_in}, needs_clarification={needs_clarification}")
        return result


import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

openai_client = None

def get_openai_client():
    """Get OpenAI client instance"""
    global openai_client
    
    if not OPENAI_API_KEY:
        print("[OpenAI Config] No API key provided, OpenAI features disabled")
        return None
    
    if openai_client is None:
        try:
            # Initialize OpenAI client with ONLY the API key
            # Some versions have issues with additional parameters like timeout, proxies, etc.
            # Use the absolute minimum to ensure compatibility
            openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            print("[OpenAI Config] Client initialized successfully")
        except TypeError as e:
            # Handle version-specific issues - the error mentions 'proxies' but we're not passing it
            # This might be an internal httpx/openai version conflict
            error_msg = str(e)
            print(f"[OpenAI Config] TypeError during initialization: {error_msg}")
            
            # Try to diagnose the issue
            if "proxies" in error_msg:
                print("[OpenAI Config] Note: 'proxies' error detected - this may be an httpx version issue")
                print("[OpenAI Config] Attempting workaround...")
                
                # Try importing and checking httpx version
                try:
                    import httpx
                    print(f"[OpenAI Config] httpx version: {httpx.__version__}")
                except:
                    pass
                
                # The error might be coming from httpx internally
                # Try to work around by ensuring we're not passing any extra args
                try:
                    # Force re-import to clear any cached issues
                    import importlib
                    import openai
                    importlib.reload(openai)
                    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
                    print("[OpenAI Config] Client initialized successfully (after reload)")
                except Exception as e2:
                    print(f"[OpenAI Config] Workaround failed: {e2}")
                    print("[OpenAI Config] Continuing without OpenAI features")
                    return None
            else:
                print(f"[OpenAI Config] Unexpected TypeError: {e}")
                print("[OpenAI Config] Continuing without OpenAI features")
                return None
        except Exception as e:
            print(f"[OpenAI Config] Error initializing client: {e}")
            import traceback
            traceback.print_exc()
            print("[OpenAI Config] Continuing without OpenAI features")
            return None
    
    return openai_client


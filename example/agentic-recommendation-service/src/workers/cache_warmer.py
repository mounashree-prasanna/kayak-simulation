"""
Cache Warmer: Periodically warm cache for hot routes
"""
import asyncio
from src.services.caching_service import CachingService

class CacheWarmer:
    def __init__(self):
        self.cache = CachingService()
        self.running = True
        self.warm_interval = 3600  # 1 hour
    
    async def start(self):
        """Start periodic cache warming"""
        await self.cache.initialize()
        print("[Cache Warmer] Started")
        
        while self.running:
            try:
                print("[Cache Warmer] Warming cache for hot routes...")
                await self.cache.warm_cache_for_hot_routes()
                print("[Cache Warmer] Cache warmed")
            except Exception as e:
                print(f"[Cache Warmer] Error: {e}")
            
            await asyncio.sleep(self.warm_interval)
    
    def stop(self):
        """Stop cache warmer"""
        self.running = False
        print("[Cache Warmer] Stopped")


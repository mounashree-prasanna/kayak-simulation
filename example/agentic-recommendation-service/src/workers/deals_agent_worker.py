"""
Deals Agent Worker: Runs the complete pipeline
- Feed Ingestion
- Normalization
- Deal Detector
- Offer Tagger
"""
import asyncio
import signal
import sys
from src.services.deals_agent import (
    FeedIngestion,
    NormalizationStage,
    DealDetector,
    OfferTagger
)

class DealsAgentWorker:
    def __init__(self):
        self.feed_ingestion = FeedIngestion()
        self.normalization = NormalizationStage()
        self.deal_detector = DealDetector()
        self.offer_tagger = OfferTagger()
        self.running = True
    
    async def start(self):
        """Start all pipeline stages"""
        print("[Deals Agent Worker] Starting pipeline...")
        
        # Start all stages
        await self.feed_ingestion.start()
        await self.normalization.start()
        await self.deal_detector.start()
        await self.offer_tagger.start()
        
        print("[Deals Agent Worker] All stages started")
        
        # Run processing in parallel
        await asyncio.gather(
            self.normalization.process(),
            self.deal_detector.process(),
            self.offer_tagger.process()
        )
    
    async def stop(self):
        """Stop all pipeline stages"""
        print("[Deals Agent Worker] Stopping pipeline...")
        self.running = False
        
        await self.feed_ingestion.stop()
        await self.normalization.stop()
        await self.deal_detector.stop()
        await self.offer_tagger.stop()
        
        print("[Deals Agent Worker] All stages stopped")

async def main():
    """Main entry point for deals agent worker"""
    worker = DealsAgentWorker()
    
    # Handle shutdown signals
    def signal_handler(sig, frame):
        print("\n[Deals Agent Worker] Shutdown signal received")
        asyncio.create_task(worker.stop())
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await worker.start()
    except KeyboardInterrupt:
        await worker.stop()

if __name__ == "__main__":
    asyncio.run(main())


#!/usr/bin/env python3
"""
Manual CSV Ingestion Script
Run this to test CSV ingestion without using the API
"""
import asyncio
import sys
sys.path.insert(0, '/app')

from src.services.deals_agent.feed_ingestion import FeedIngestion

async def ingest_csv_manual(file_path: str, listing_type: str):
    """Manually ingest a CSV file"""
    feed_ingestion = FeedIngestion()
    await feed_ingestion.start()
    
    try:
        print(f"[Manual Ingestion] Starting ingestion of {file_path}...")
        await feed_ingestion.ingest_csv(file_path, listing_type)
        print(f"[Manual Ingestion] Completed successfully!")
    except Exception as e:
        print(f"[Manual Ingestion] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await feed_ingestion.stop()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python test_csv_ingestion.py <file_path> <listing_type>")
        print("Example: python test_csv_ingestion.py /app/data/csv/flights/flight_prices.csv Flight")
        sys.exit(1)
    
    file_path = sys.argv[1]
    listing_type = sys.argv[2]
    
    asyncio.run(ingest_csv_manual(file_path, listing_type))


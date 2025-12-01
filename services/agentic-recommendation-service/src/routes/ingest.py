"""
CSV Ingestion Endpoint: Manually trigger CSV file ingestion
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.services.deals_agent.feed_ingestion import FeedIngestion
import os

router = APIRouter()

class CSVIngestRequest(BaseModel):
    file_path: str
    listing_type: str = "Hotel"  # "Hotel" or "Flight"

@router.post("/csv")
async def ingest_csv(request: CSVIngestRequest):
    """
    Manually trigger CSV file ingestion
    
    Example:
    {
        "file_path": "/app/data/csv/hotels/airbnb_nyc_listings.csv",
        "listing_type": "Hotel"
    }
    """
    try:
        # Validate file path
        if not os.path.exists(request.file_path):
            raise HTTPException(
                status_code=404,
                detail=f"CSV file not found: {request.file_path}"
            )
        
        # Validate listing type
        if request.listing_type not in ["Hotel", "Flight"]:
            raise HTTPException(
                status_code=400,
                detail="listing_type must be 'Hotel' or 'Flight'"
            )
        
        # Initialize feed ingestion
        feed_ingestion = FeedIngestion()
        await feed_ingestion.start()
        
        try:
            # Ingest CSV file
            await feed_ingestion.ingest_csv(request.file_path, request.listing_type)
            
            return {
                "success": True,
                "message": f"Successfully ingested {request.file_path}",
                "listing_type": request.listing_type
            }
        finally:
            await feed_ingestion.stop()
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error ingesting CSV: {str(e)}"
        )

@router.get("/csv/list")
async def list_csv_files():
    """
    List available CSV files in the data directory
    """
    try:
        csv_dir = "/app/data/csv"
        files = []
        
        if os.path.exists(csv_dir):
            for root, dirs, filenames in os.walk(csv_dir):
                for filename in filenames:
                    if filename.endswith('.csv'):
                        full_path = os.path.join(root, filename)
                        files.append({
                            "path": full_path,
                            "name": filename,
                            "size": os.path.getsize(full_path) if os.path.exists(full_path) else 0
                        })
        
        return {
            "success": True,
            "files": files,
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing CSV files: {str(e)}"
        )


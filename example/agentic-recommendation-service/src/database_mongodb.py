from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os
import atexit
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://alishakartik_db_user:LSnNV7VtlqoeKZdT@cluster-236.njc5716.mongodb.net/kayak?appName=Cluster-236"
)

client: Optional[AsyncIOMotorClient] = None
database = None

async def get_database():
    """Get MongoDB database instance"""
    global client, database
    if client is None:
        client = AsyncIOMotorClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000
        )
        database = client.get_database("kayak")
        # Test connection
        try:
            await client.admin.command('ping')
            print("[MongoDB] Connected successfully")
        except Exception as e:
            print(f"[MongoDB] Connection test failed: {e}")
    return database

async def close_database():
    """Close MongoDB connection"""
    global client, database
    if client:
        try:
            # Stop monitoring threads before closing
            client.close()
            print("[MongoDB] Connection closed")
        except Exception as e:
            print(f"[MongoDB] Error closing connection: {e}")
        finally:
            client = None
            database = None

async def get_popularity_collection():
    """Get search popularity collection"""
    db = await get_database()
    return db["search_popularity"]

async def increment_search_popularity(user_id: str, route: str):
    """Increment search count for a route (unique per user per route)"""
    collection = await get_popularity_collection()
    await collection.update_one(
        {"user_id": user_id, "route": route},
        {"$inc": {"count": 1}, "$setOnInsert": {"first_searched": None}},
        upsert=True
    )

async def get_hot_routes(limit: int = 10):
    """Get top N most searched routes"""
    collection = await get_popularity_collection()
    cursor = collection.aggregate([
        {"$group": {
            "_id": "$route",
            "total_searches": {"$sum": "$count"},
            "unique_users": {"$addToSet": "$user_id"}
        }},
        {"$project": {
            "route": "$_id",
            "total_searches": 1,
            "unique_users_count": {"$size": "$unique_users"}
        }},
        {"$sort": {"total_searches": -1}},
        {"$limit": limit}
    ])
    return await cursor.to_list(length=limit)

# Register cleanup on exit to minimize thread errors
def _cleanup():
    """Synchronous cleanup for atexit"""
    global client
    if client:
        try:
            client.close()
        except:
            pass

atexit.register(_cleanup)


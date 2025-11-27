from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import os

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/kayak_db")
DATABASE_NAME = "kayak_db"

client: AsyncIOMotorClient = None
database = None

async def init_db():
    global client, database
    try:
        client = AsyncIOMotorClient(MONGODB_URI)
        database = client[DATABASE_NAME]
        # Test connection
        await client.admin.command('ping')
        print(f"[Recommendation Service] Connected to MongoDB")
    except ConnectionFailure as e:
        print(f"[Recommendation Service] MongoDB connection failed: {e}")
        raise

async def get_database():
    return database

async def close_db():
    if client:
        client.close()


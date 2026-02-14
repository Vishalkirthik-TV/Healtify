import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
print(f"Testing connection to: {MONGO_URL.split('@')[-1] if '@' in MONGO_URL else 'HIDDEN'}")

async def test_mongo():
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        # Force a connection
        await client.admin.command('ping')
        print("✅ Connection Successful!")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    if not MONGO_URL:
        print("❌ MONGO_URL not found in environment")
    else:
        asyncio.run(test_mongo())

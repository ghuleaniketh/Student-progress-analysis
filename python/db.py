import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("spa.db")

_client: AsyncIOMotorClient | None = None
db = None   # module-level reference, set on startup


async def connect_db():
    global _client, db
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is not set in .env")

    _client = AsyncIOMotorClient(uri)
    db_name = os.getenv("MONGO_DB_NAME", "spa_db")
    db = _client[db_name]
    logger.info("MongoDB connected → %s", db_name)


async def close_db():
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")
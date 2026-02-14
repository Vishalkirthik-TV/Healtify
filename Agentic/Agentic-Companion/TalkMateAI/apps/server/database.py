import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# Config
MONGO_URL = None # Lazy load
DB_NAME = "talkmate"

db = None
client = None

async def init_db():
    """Initialize MongoDB connection and indexes"""
    global db, client, MONGO_URL
    
    # Load config now to ensure .env is ready
    if not MONGO_URL:
        MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        
    try:
        if not client:
            logger.info(f"🔌 Connecting to MongoDB at {MONGO_URL.split('@')[-1] if '@' in MONGO_URL else 'localhost'}...")
            # Set timeout to 5 seconds to prevent indefinite hang
            client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
            db = client[DB_NAME]
            
            # Create indexes (this triggers the actual connection)
            await db.users.create_index("username", unique=True)
            
            logger.info(f"✅ MongoDB initialized: {DB_NAME}")
    except Exception as e:
        logger.error(f"❌ MongoDB initialization failed: {e}")
        raise e

async def create_user(username, hashed_password):
    """Create a new user in MongoDB"""
    if db is None:
        await init_db()
        
    try:
        user_doc = {
            "username": username,
            "hashed_password": hashed_password,
            "created_at": "CURRENT_TIMESTAMP" # Or actual datetime
        }
        result = await db.users.insert_one(user_doc)
        return str(result.inserted_id)
    except Exception as e:
        # Check for duplicate key error (code 11000)
        if hasattr(e, 'code') and e.code == 11000:
            return None
        logger.error(f"Error creating user: {e}")
        return None

async def get_user_by_username(username):
    """Get a user by username"""
    if db is None:
        await init_db()
        
    try:
        user = await db.users.find_one({"username": username})
        if user:
            return user
        return None
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return None

async def save_conversation_log(user_id: str, messages: list, summary: str = "Conversation ended."):
    """Save a conversation session to Long-Term Memory (MongoDB)"""
    if db is None:
        await init_db()
    
    if not messages:
        return
        
    try:
        log_entry = {
            "user_id": user_id,
            "timestamp": "CURRENT_TIMESTAMP", # Using server time in practice
            "messages": messages,
            "summary": summary
        }
        # In a real app we'd use datetime.now()
        from datetime import datetime
        log_entry["timestamp"] = datetime.now()
        
        await db.conversations.insert_one(log_entry)
        logger.info(f"💾 Conversation saved to LTM for user {user_id}")
    except Exception as e:
        logger.error(f"❌ Error saving conversation log: {e}")

async def get_recent_conversations(user_id: str, limit: int = 3):
    """Retrieve recent conversation logs for context"""
    if db is None:
        await init_db()
        
    try:
        cursor = db.conversations.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit)
        
        recent_chats = await cursor.to_list(length=limit)
        
        # Flatten history for context
        context_str = ""
        for chat in reversed(recent_chats):
            # timestamp = chat['timestamp'].strftime("%Y-%m-%d %H:%M")
            # context_str += f"\n[Session Date: {timestamp}]\n"
            for msg in chat.get("messages", []):
                role = msg.get("role", "unknown")
                text = msg.get("parts", [""])[0] if isinstance(msg.get("parts"), list) else ""
                context_str += f"{role}: {text}\n"
                
        return context_str

    except Exception as e:
        logger.error(f"Error fetching LTM: {e}")
        return ""

async def get_all_conversations(user_id: str, limit: int = 20):
    """Retrieve all conversation summaries for history view"""
    if db is None:
        await init_db()
        
    try:
        cursor = db.conversations.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit)
        
        chats = await cursor.to_list(length=limit)
        
        result = []
        for chat in chats:
            result.append({
                "id": str(chat["_id"]),
                "timestamp": chat["timestamp"].isoformat() if hasattr(chat["timestamp"], "isoformat") else str(chat["timestamp"]),
                "summary": chat.get("summary", "No summary available")
            })
            
        return result
    except Exception as e:
        logger.error(f"Error fetching conversation history: {e}")
        return []

async def save_reminder(user_id: str, type: str, remind_time: str, message: str):
    """Save a new reminder"""
    if db is None:
        await init_db()
    try:
        from datetime import datetime
        # Parse ISO string to datetime object for query comparison
        try:
             dt = datetime.fromisoformat(remind_time)
        except ValueError:
             # Fallback if AI gives loose format, try to parse or keep as string (but better to enforce ISO in prompt)
             dt = remind_time 

        reminder = {
            "user_id": user_id,
            "type": type.lower(), # 'sms' or 'call'
            "remind_time": dt, 
            "message": message,
            "status": "pending",
            "created_at": datetime.now()
        }
        await db.reminders.insert_one(reminder)
        logger.info(f"💾 Scheduled reminder for {user_id} at {remind_time}")
        return True
    except Exception as e:
        logger.error(f"❌ Error saving reminder: {e}")
        return False

async def get_pending_reminders():
    """Get all reminders that are due and pending"""
    if db is None:
        await init_db()
    try:
        from datetime import datetime
        now = datetime.now()
        # Find reminders where status is pending AND time is <= now
        cursor = db.reminders.find({
            "status": "pending",
            "remind_time": {"$lte": now}
        })
        return await cursor.to_list(length=100)
    except Exception as e:
        logger.error(f"Error fetching pending reminders: {e}")
        return []

async def update_reminder_status(reminder_id, status):
    """Update status of a reminder"""
    if db is None:
        await init_db()
    try:
        await db.reminders.update_one(
            {"_id": reminder_id},
            {"$set": {"status": status}}
        )
    except Exception as e:
        logger.error(f"Error updating reminder status: {e}")

async def get_user_reminders(user_id: str, limit: int = 50):
    """Get all reminders for a specific user"""
    if db is None:
        await init_db()
    try:
        # Sort by remind_time descending (newest first)
        cursor = db.reminders.find({"user_id": user_id}).sort("remind_time", -1).limit(limit)
        reminders = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and datetime to isoformat
        result = []
        for r in reminders:
            r["id"] = str(r["_id"])
            del r["_id"]
            if "remind_time" in r and hasattr(r["remind_time"], "isoformat"):
                r["remind_time"] = r["remind_time"].isoformat()
            if "created_at" in r and hasattr(r["created_at"], "isoformat"):
                r["created_at"] = r["created_at"].isoformat()
            result.append(r)
            
        return result
    except Exception as e:
        logger.error(f"Error fetching user reminders: {e}", exc_info=True)
        return []

async def close_db():
    global client
    if client:
        client.close()
        client = None
        logger.info("MongoDB connection closed")

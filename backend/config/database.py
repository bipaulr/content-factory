"""Database configuration and connection"""
import os
from typing import Optional
from mongoengine import connect, disconnect

MONGODB_URI = os.getenv("MONGODB_URI")
USE_MONGODB = os.getenv("USE_MONGODB", "false").lower() == "true"

def init_mongodb():
    """Initialize MongoDB connection for production"""
    if not MONGODB_URI:
        raise ValueError(
            "MONGODB_URI not found in environment variables. "
            "Get a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas"
        )
    
    try:
        # Disconnect any existing connection
        disconnect()
        
        # Connect to MongoDB with proper settings for Vercel
        connect(
            host=MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            retryWrites=True,
            w='majority'
        )
        print("✓ Connected to MongoDB Atlas")
        return True
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        raise

def get_db_client():
    """Get the appropriate database client"""
    if USE_MONGODB and MONGODB_URI:
        return "mongodb"
    return "sqlite"

# Auto-initialize on import if using MongoDB
if USE_MONGODB:
    try:
        init_mongodb()
    except Exception as e:
        print(f"Warning: MongoDB initialization failed: {e}")
        print("Falling back to SQLite")

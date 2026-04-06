import sqlite3
import os
from datetime import datetime
from typing import Optional, Dict

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "campaigns", "users.db")

class User:
    """User model for Google Auth users"""
    
    def __init__(self, user_id: str, email: str, name: str, google_id: str, image_url: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.name = name
        self.google_id = google_id
        self.image_url = image_url
        self.created_at = datetime.now().isoformat()
        self.last_login = datetime.now().isoformat()
    
    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "name": self.name,
            "google_id": self.google_id,
            "image_url": self.image_url,
            "created_at": self.created_at,
            "last_login": self.last_login,
        }

class UserDatabase:
    """SQLite database for user management"""
    
    @staticmethod
    def init_db():
        """Initialize the database schema"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                google_id TEXT UNIQUE NOT NULL,
                image_url TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT NOT NULL
            )
        """)
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def create_or_update_user(google_id: str, email: str, name: str, image_url: Optional[str] = None) -> User:
        """Create a new user or update existing one"""
        UserDatabase.init_db()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT user_id FROM users WHERE google_id = ?", (google_id,))
        result = cursor.fetchone()
        
        if result:
            # Update last_login
            user_id = result[0]
            cursor.execute(
                "UPDATE users SET last_login = ? WHERE user_id = ?",
                (datetime.now().isoformat(), user_id)
            )
            conn.commit()
            user = UserDatabase.get_user_by_id(user_id)
        else:
            # Create new user
            from uuid import uuid4
            user_id = str(uuid4())
            user = User(user_id, email, name, google_id, image_url)
            
            cursor.execute("""
                INSERT INTO users (user_id, email, name, google_id, image_url, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user.user_id, user.email, user.name, user.google_id, user.image_url, user.created_at, user.last_login))
            
            conn.commit()
        
        conn.close()
        return user
    
    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[User]:
        """Get user by user_id"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return User(row[0], row[1], row[2], row[3], row[4])
        return None
    
    @staticmethod
    def get_user_by_google_id(google_id: str) -> Optional[User]:
        """Get user by google_id"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return User(row[0], row[1], row[2], row[3], row[4])
        return None
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return User(row[0], row[1], row[2], row[3], row[4])
        return None

import sqlite3
import os
from datetime import datetime
from typing import Optional, Dict
import bcrypt
import re

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "campaigns", "users.db")

class User:
    """User model supporting both Google Auth and email/password auth"""
    
    def __init__(self, user_id: str, email: str, name: str, google_id: Optional[str] = None, 
                 password_hash: Optional[str] = None, image_url: Optional[str] = None):
        self.user_id = user_id
        self.email = email
        self.name = name
        self.google_id = google_id
        self.password_hash = password_hash  # bcrypt hash, never plain text
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
    
    def verify_password(self, password: str) -> bool:
        """Verify a password against the stored hash"""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

class UserDatabase:
    """SQLite database for user management (Google Auth + Email/Password Auth)"""
    
    @staticmethod
    def init_db():
        """Initialize the database schema"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create users table with support for both auth methods
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                google_id TEXT UNIQUE,
                password_hash TEXT,
                image_url TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT NOT NULL
            )
        """)
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        """Validate password strength. Returns (is_valid, error_message)"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r'[0-9]', password):
            return False, "Password must contain at least one digit"
        return True, ""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt with salt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def create_user_with_email(email: str, name: str, password: str) -> tuple[Optional[User], Optional[str]]:
        """Create a new user with email/password. Returns (User, error_message)"""
        UserDatabase.init_db()
        
        # Validate email
        if not UserDatabase.validate_email(email):
            return None, "Invalid email format"
        
        # Validate password strength
        is_valid, error = UserDatabase.validate_password(password)
        if not is_valid:
            return None, error
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute("SELECT user_id FROM users WHERE email = ?", (email.lower(),))
        if cursor.fetchone():
            conn.close()
            return None, "Email already registered"
        
        # Create new user
        from uuid import uuid4
        user_id = str(uuid4())
        password_hash = UserDatabase.hash_password(password)
        now = datetime.now().isoformat()
        
        try:
            cursor.execute("""
                INSERT INTO users (user_id, email, name, password_hash, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, email.lower(), name, password_hash, now, now))
            
            conn.commit()
            user = User(user_id, email.lower(), name, None, password_hash, None)
            conn.close()
            return user, None
        except sqlite3.IntegrityError as e:
            conn.close()
            return None, "Email already registered"
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        UserDatabase.init_db()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower(),))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return User(row[0], row[1], row[2], row[3], row[4], row[5])
        return None
    
    @staticmethod
    def update_last_login(user_id: str):
        """Update last login timestamp"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE user_id = ?",
            (datetime.now().isoformat(), user_id)
        )
        
        conn.commit()
        conn.close()
    
    @staticmethod
    def create_or_update_user(google_id: str, email: str, name: str, image_url: Optional[str] = None) -> User:
        """Create a new user or update existing one (Google Auth)"""
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
            user = User(user_id, email, name, google_id, None, image_url)
            now = datetime.now().isoformat()
            
            cursor.execute("""
                INSERT INTO users (user_id, email, name, google_id, image_url, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user.user_id, user.email, user.name, user.google_id, user.image_url, now, now))
            
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
            return User(row[0], row[1], row[2], row[3], row[4], row[5])
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
            return User(row[0], row[1], row[2], row[3], row[4], row[5])
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

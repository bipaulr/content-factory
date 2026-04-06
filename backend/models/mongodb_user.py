"""MongoDB User Model for production use"""
from mongoengine import Document, StringField, EmailField, DateTimeField, URLField, BooleanField
from datetime import datetime
from typing import Optional, Dict
from uuid import uuid4

class MongoUser(Document):
    """User model for MongoDB - supports Google OAuth and future username/password auth"""
    
    user_id = StringField(primary_key=True, default=lambda: str(uuid4()))
    email = EmailField(unique=True, required=True)
    name = StringField(required=True)
    
    # Google OAuth fields
    google_id = StringField(unique=True, sparse=True)  # sparse allows null values
    google_profile_picture = URLField(null=True)  # Store Google profile picture URL
    
    # Future username/password auth fields
    username = StringField(unique=True, sparse=True)  # For future login
    password_hash = StringField(null=True)  # For future password-based auth
    
    # Metadata
    created_at = DateTimeField(default=datetime.utcnow)
    last_login = DateTimeField(default=datetime.utcnow)
    is_active = BooleanField(default=True)
    
    meta = {
        'collection': 'users',
        'indexes': [
            'email',
            'google_id',
            'username'
        ]
    }
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "name": self.name,
            "google_id": self.google_id,
            "google_profile_picture": self.google_profile_picture,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "is_active": self.is_active,
        }
    
    @classmethod
    def create_or_update_from_google(
        cls,
        google_id: str,
        email: str,
        name: str,
        profile_picture_url: Optional[str] = None
    ) -> 'MongoUser':
        """Create or update user from Google OAuth data"""
        try:
            # Try to find existing user
            user = cls.objects(google_id=google_id).first()
            
            if user:
                # Update existing user
                user.update(
                    set__email=email,
                    set__name=name,
                    set__google_profile_picture=profile_picture_url,
                    set__last_login=datetime.utcnow()
                )
                user.reload()
            else:
                # Create new user
                user = cls(
                    google_id=google_id,
                    email=email,
                    name=name,
                    google_profile_picture=profile_picture_url
                )
                user.save()
            
            return user
        except Exception as e:
            print(f"Error creating/updating user from Google: {e}")
            raise
    
    @classmethod
    def get_by_id(cls, user_id: str) -> Optional['MongoUser']:
        """Get user by user_id"""
        return cls.objects(user_id=user_id).first()
    
    @classmethod
    def get_by_email(cls, email: str) -> Optional['MongoUser']:
        """Get user by email"""
        return cls.objects(email=email).first()
    
    @classmethod
    def get_by_google_id(cls, google_id: str) -> Optional['MongoUser']:
        """Get user by Google ID"""
        return cls.objects(google_id=google_id).first()
    
    @classmethod
    def get_by_username(cls, username: str) -> Optional['MongoUser']:
        """Get user by username (for future password auth)"""
        return cls.objects(username=username).first()

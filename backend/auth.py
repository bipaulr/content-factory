import os
import jwt
import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

class AuthManager:
    """Manages JWT tokens and authentication"""
    
    @staticmethod
    def create_token(user_id: str) -> str:
        """Create a JWT token for a user"""
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
            "iat": datetime.utcnow(),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def verify_google_token(token: str) -> Optional[Dict]:
        """Verify a Google OAuth token"""
        try:
            # Get Google's public keys
            google_keys_url = "https://www.googleapis.com/oauth2/v1/certs"
            response = requests.get(google_keys_url)
            keys = response.json()
            
            # Decode without verification first to get the kid (key id)
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            # Get the key
            if kid not in keys:
                return None
            
            key = keys[kid]
            
            # Verify and decode
            payload = jwt.decode(
                token,
                key=key,
                algorithms=["RS256"],
                audience=os.getenv("GOOGLE_CLIENT_ID")
            )
            
            return payload
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    
    @staticmethod
    def exchange_code_for_token(code: str, redirect_uri: str) -> Optional[Dict]:
        """Exchange Google authorization code for tokens"""
        try:
            token_url = "https://oauth2.googleapis.com/token"
            
            data = {
                "code": code,
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
            
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            
            return response.json()
        except Exception as e:
            print(f"Token exchange error: {e}")
            return None
    
    @staticmethod
    def get_user_info_from_google_token(access_token: str) -> Optional[Dict]:
        """Get user info from Google using the access token"""
        try:
            user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"
            
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(user_info_url, headers=headers)
            response.raise_for_status()
            
            user_data = response.json()
            return {
                "google_id": user_data.get("id"),
                "email": user_data.get("email"),
                "name": user_data.get("name"),
                "image_url": user_data.get("picture"),
            }
        except Exception as e:
            print(f"User info fetch error: {e}")
            return None

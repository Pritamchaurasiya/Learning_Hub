"""
Learning Hub SDK Authentication
"""

import json
import time
from typing import Optional, Dict, Any
from .exceptions import AuthenticationError, APIError

class Auth:
    """Authentication handler for Learning Hub API."""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None, 
                 username: Optional[str] = None, password: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.username = username
        self.password = password
        self._access_token = None
        self._refresh_token = None
        self._token_expires_at = None
        
    def authenticate(self) -> Dict[str, Any]:
        """Authenticate with the API and return tokens."""
        if self.api_key:
            return self._authenticate_with_api_key()
        elif self.username and self.password:
            return self._authenticate_with_credentials()
        else:
            raise AuthenticationError("No authentication credentials provided")
    
    def _authenticate_with_api_key(self) -> Dict[str, Any]:
        """Authenticate using API key."""
        self._access_token = self.api_key
        return {"access_token": self.api_key}
    
    def _authenticate_with_credentials(self) -> Dict[str, Any]:
        """Authenticate using username and password."""
        import requests
        
        url = f"{self.base_url}/api/v1/auth/login/"
        data = {
            "username": self.username,
            "password": self.password
        }
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            
            tokens = response.json()
            self._access_token = tokens["access"]
            self._refresh_token = tokens["refresh"]
            self._token_expires_at = time.time() + 3600  # 1 hour
            
            return tokens
            
        except requests.exceptions.RequestException as e:
            raise AuthenticationError(f"Authentication failed: {e}")
    
    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers."""
        if not self._access_token:
            self.authenticate()
        
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }
    
    def refresh_access_token(self) -> str:
        """Refresh the access token."""
        if not self._refresh_token:
            raise AuthenticationError("No refresh token available")
        
        import requests
        
        url = f"{self.base_url}/api/v1/auth/refresh/"
        data = {"refresh": self._refresh_token}
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            
            tokens = response.json()
            self._access_token = tokens["access"]
            self._token_expires_at = time.time() + 3600
            
            return self._access_token
            
        except requests.exceptions.RequestException as e:
            raise AuthenticationError(f"Token refresh failed: {e}")
    
    def is_token_expired(self) -> bool:
        """Check if the access token is expired."""
        if not self._token_expires_at:
            return True
        
        return time.time() >= self._token_expires_at
    
    def ensure_valid_token(self) -> str:
        """Ensure we have a valid access token."""
        if not self._access_token or self.is_token_expired():
            if self._refresh_token:
                self.refresh_access_token()
            else:
                self.authenticate()
        
        return self._access_token

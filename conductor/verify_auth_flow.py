
import os
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

def verify_auth():
    client = APIClient()
    email = "verify_auth_user@example.com"
    password = "StrongPassword123!"
    
    print("--- Starting Auth Verification ---")
    
    # 1. Register
    print(f"1. Registering user {email}...")
    reg_data = {
        "email": email,
        "password": password,
        "first_name": "Verify",
        "last_name": "Auth",
        "role": "student"
    }
    reg_resp = client.post("/api/v1/auth/register/", reg_data, format="json")
    
    if reg_resp.status_code == 201:
        print("   SUCCESS: Registration successful")
    elif reg_resp.status_code == 400 and b"already exists" in reg_resp.content:
        print("   Note: User already exists (continuing to login)")
    else:
        print(f"   FAILED: Registration failed {reg_resp.status_code}")
        print(f"   Response: {reg_resp.content.decode()}")
        return False
        
    # 2. Login
    print("2. Logging in...")
    login_data = {"email": email, "password": password}
    login_resp = client.post("/api/v1/auth/login/", login_data, format="json")
    
    if login_resp.status_code != 200:
        print(f"   FAILED: Login failed {login_resp.status_code}")
        print(f"   Response: {login_resp.content.decode()}")
        return False
        
    tokens = login_resp.json()
    if "access" not in tokens or "refresh" not in tokens:
        print(f"   FAILED: Tokens missing in response: {tokens.keys()}")
        return False
        
    access_token = tokens["access"]
    print("   SUCCESS: Login successful, tokens received")

    # 3. Verify /users/me/
    print("3. Verifying /api/v1/users/me/ ...")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    me_resp = client.get("/api/v1/users/me/")
    
    if me_resp.status_code != 200:
        print(f"   FAILED: /users/me/ failed {me_resp.status_code}")
        print(f"   Response: {me_resp.content.decode()}")
        return False
        
    user_data = me_resp.json()
    if user_data.get("email") != email:
        print(f"   FAILED: Email mismatch {user_data.get('email')} != {email}")
        return False
        
    print(f"   SUCCESS: User profile verified for {user_data.get('email')}")
    print("--- Auth Verification COMPLETE ---")
    return True

if __name__ == "__main__":
    if verify_auth():
        print("Integration Test PASSED")
        exit(0)
    else:
        print("Integration Test FAILED")
        exit(1)

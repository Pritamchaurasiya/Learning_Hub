import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1/auth"

def test_auth():
    email = "test_godmode@example.com"
    password = "SecurePassword123!"
    username = "godmode_user"

    print(f"Testing Auth with: {email}")

    # 1. Register
    reg_payload = {
        "email": email,
        "username": username,
        "password": password,
        "password_confirm": password,  # Backend expects this based on serializer
        "display_name": "God Mode User"
    }
    
    try:
        print("\n--- Registering ---")
        reg_resp = requests.post(f"{BASE_URL}/register/", json=reg_payload)
        print(f"Status: {reg_resp.status_code}")
        print(f"Response: {reg_resp.text}")
        
        if reg_resp.status_code == 400:
             if "unique" in reg_resp.text:
                 print("User likely already exists. Proceeding to login.")
        elif reg_resp.status_code != 201:
             print("Registration Failed!")
             return

    except Exception as e:
        print(f"Registration Exception: {e}")
        return

    # 2. Login
    login_payload = {
        "email": email,
        "password": password
    }

    try:
        print("\n--- Logging In ---")
        login_resp = requests.post(f"{BASE_URL}/login/", json=login_payload)
        print(f"Status: {login_resp.status_code}")
        print(f"Response: {login_resp.text}")

        if login_resp.status_code == 200:
            print("\n✅ LOGIN SUCCESSFUL!")
            data = login_resp.json().get("data", {})
            print(f"Token: {data.get('accessToken')[:10]}...")
        else:
             print("\n❌ LOGIN FAILED!")

    except Exception as e:
        print(f"Login Exception: {e}")

if __name__ == "__main__":
    test_auth()

import requests
import os
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

def verify_streaming():
    # Login first to get token
    login_url = "http://127.0.0.1:8000/api/v1/auth/login/"
    data = {"email": "verify_auth_user@example.com", "password": "StrongPassword123!"}
    
    print("1. Logging in for token...")
    try:
        resp = requests.post(login_url, json=data)
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code}")
            return False
            
        token = resp.json()["access"]
        print("   Token acquired.")
    except Exception as e:
        print(f"Login exception: {e}")
        return False

    # Test Streaming Endpoint
    stream_url = "http://127.0.0.1:8000/api/v1/ai/tutor/stream/"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "module_filename": "01_introduction_to_research.md", # Assume exists
        "question": "What is research?"
    }
    
    print("2. Testing Stream Endpoint...")
    try:
        with requests.post(stream_url, json=payload, headers=headers, stream=True) as r:
            if r.status_code != 200:
                print(f"Stream failed: {r.status_code}")
                # print(r.text) # Debug
                return False
            
            print("   Connected. Receiving chunks:")
            chunk_count = 0
            for chunk in r.iter_content(chunk_size=None):
                if chunk:
                    print(f"   Chunk: {chunk.decode()}")
                    chunk_count += 1
                    if chunk_count > 3:
                        print("   ... (Verified, stopping)")
                        break
                        
            print("SUCCESS: Streaming verified.")
            return True
            
    except Exception as e:
        print(f"Stream exception: {e}")
        return False

if __name__ == "__main__":
    verify_streaming()

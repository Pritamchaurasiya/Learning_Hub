
import os
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from rest_framework.test import APIClient
from django.urls import reverse

def verify_integration():
    client = APIClient()
    print("Verifying Critical API Endpoints...")
    
    # 1. Health Check
    try:
        response = client.get("/health/")
        print(f"Health Check: {response.status_code} (Expected 200)")
        if response.status_code != 200:
            print(f"FAILED: Health check failed. Response: {response.content.decode()}")
            return False
    except Exception as e:
        print(f"FAILED: Health check exception {e}")
        return False

    # 2. Courses API (Public)
    try:
        # Assuming '/api/v1/courses/' maps to a list view
        # We need to construct the URL manually or use reverse if we know the name
        url = "/api/v1/courses/" 
        response = client.get(url)
        print(f"Courses Endpoint: {response.status_code} (Expected 200 or 401 depending on auth)")
        # If it returns 200, great. If 401, that confirms connection but requires auth.
        if response.status_code not in [200, 401, 403]:
             print(f"FAILED: Unexpected status code {response.status_code}")
             return False
    except Exception as e:
        print(f"FAILED: Courses endpoint exception {e}")
        return False
        
    print("SUCCESS: Core API connectivity verified (In-Memory).")
    return True

if __name__ == "__main__":
    success = verify_integration()
    if not success:
        exit(1)

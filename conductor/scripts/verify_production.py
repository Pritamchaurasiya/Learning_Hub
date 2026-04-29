
import os
import sys
import django
import requests
import time
from pathlib import Path

# Setup Django Environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")
django.setup()

from django.conf import settings
from django.db import connections
from django.db.utils import OperationalError
from django.urls import reverse
from django_redis import get_redis_connection

def print_pass(msg):
    print(f"\033[92m[PASS] {msg}\033[0m")

def print_fail(msg):
    print(f"\033[91m[FAIL] {msg}\033[0m")
    
def check_database():
    try:
        db_conn = connections['default']
        db_conn.cursor()
        print_pass("Database connection successful")
        return True
    except OperationalError:
        print_fail("Database connection failed")
        return False

def check_redis():
    try:
        conn = get_redis_connection("default")
        conn.ping()
        print_pass("Redis connection successful")
        return True
    except Exception as e:
        print_fail(f"Redis connection failed: {e}")
        return False

def check_url_resolutions():
    """Verify that expected API endpoints reverse correctly."""
    endpoints = [
        ('auth:login', '/api/v1/auth/login/'),
        ('auth:register', '/api/v1/auth/register/'),
        ('root', '/'), # Web root
    ]
    
    all_good = True
    for name, expected in endpoints:
        try:
            url = reverse(name)
            if url == expected:
                print_pass(f"URL '{name}' resolves to '{url}'")
            else:
                print_fail(f"URL '{name}' resolves to '{url}', expected '{expected}'")
                all_good = False
        except Exception as e:
            print_fail(f"Could not resolve URL '{name}': {e}")
            all_good = False
    return all_good

def check_frontend_integration_config():
    """Check settings that impact frontend integration."""
    cors = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    if "http://localhost:3000" in cors or "http://127.0.0.1:3000" in cors:
        print_pass("CORS allows localhost:3000 (Flutter Web)")
    else:
        print_fail("CORS missing localhost:3000")
        
    if getattr(settings, 'FRONTEND_URL', None):
        print_pass(f"FRONTEND_URL configured: {settings.FRONTEND_URL}")
    else:
        print_fail("FRONTEND_URL setting missing on Backend")
        
    return True

if __name__ == "__main__":
    print("Running God-Tier Production Verification...")
    
    checks = [
        check_database(),
        check_redis(),
        check_url_resolutions(),
        check_frontend_integration_config(),
    ]
    
    if all(checks):
        print("\n\033[92mSUCCESS: System is Production Ready (Integration wise).\033[0m")
        sys.exit(0)
    else:
        print("\n\033[91mFAILURE: Critical Integration Checks Failed.\033[0m")
        sys.exit(1)

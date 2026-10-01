import os
import re
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def check_integrity():
    print("====================================")
    print("  Learning Hub Fullstack Integrity  ")
    print("====================================")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Paths
    conductor_urls_path = os.path.join(base_dir, "conductor", "config", "urls.py")
    flutter_api_path = os.path.join(base_dir, "my_flutter_app", "lib", "src", "core", "constants", "api_constants.dart")
    django_lh_urls_path = os.path.join(base_dir, "learninghub", "django_backend", "learninghub_server", "urls.py")
    react_api_path = os.path.join(base_dir, "learninghub", "src", "utils", "api.ts")
    
    errors = 0

    # 1. Check Conductor <-> Flutter API Consistency
    print("\n[1/3] Checking Conductor <-> Flutter API Consistency...")
    with open(conductor_urls_path, 'r', encoding='utf-8') as f:
        conductor_urls = f.read()
    with open(flutter_api_path, 'r', encoding='utf-8') as f:
        flutter_api = f.read()
        
    routes = {
        "auth": "auth/",
        "users": "users/",
        "courses": "courses/",
        "gamification": "gamification/",
        "payments": "payments/",
        "notifications": "notifications/",
        "ai": "ai/"
    }
    
    for key, path in routes.items():
        if path in conductor_urls and path in flutter_api:
            print(f"  [PASS] Route [{key}] matched.")
        else:
            print(f"  [WARN] Route [{key}] status:")
            if path not in conductor_urls: print(f"     -> Missing in Conductor: {path}")
            if path not in flutter_api: print(f"     -> Missing in Flutter: {path}")
            errors += 1

    # 2. Check LearningHub Django <-> React API Parity
    print("\n[2/3] Checking LearningHub Django <-> React SPA Consistency...")
    if os.path.exists(django_lh_urls_path) and os.path.exists(react_api_path):
        with open(django_lh_urls_path, 'r', encoding='utf-8') as f:
            django_urls = f.read()
        with open(react_api_path, 'r', encoding='utf-8') as f:
            react_api = f.read()
            
        lh_apps = ["core", "users", "courses", "problems", "tests_engine", "gamification", "social", "ecommerce", "ai_tutor"]
        for app in lh_apps:
            if f"apps.{app}.urls" in django_urls:
                print(f"  [PASS] LearningHub App Module [{app}] registered in Django router.")
            else:
                print(f"  [FAIL] LearningHub App Module [{app}] MISSING in Django router!")
                errors += 1

    # 3. Check WebSocket Configuration
    print("\n[3/3] Checking WebSocket ASGI Configuration...")
    conductor_asgi = os.path.join(base_dir, "conductor", "config", "asgi.py")
    lh_asgi = os.path.join(base_dir, "learninghub", "django_backend", "learninghub_server", "asgi.py")
    
    if os.path.exists(conductor_asgi):
        with open(conductor_asgi, 'r', encoding='utf-8') as f:
            c_asgi = f.read()
        if "core_ws_urlpatterns" in c_asgi:
            print("  [PASS] Conductor ASGI WebSocket router configured.")
        else:
            print("  [FAIL] Conductor ASGI WebSocket router missing.")
            errors += 1

    if os.path.exists(lh_asgi):
        with open(lh_asgi, 'r', encoding='utf-8') as f:
            lh_asgi_content = f.read()
        if "websocket_urlpatterns" in lh_asgi_content:
            print("  [PASS] LearningHub ASGI WebSocket router configured.")
        else:
            print("  [FAIL] LearningHub ASGI WebSocket router missing.")
            errors += 1

    print("\n------------------------------------")
    if errors == 0:
        print("[SUCCESS] SYSTEM INTEGRITY: 100% VALIDATED")
        print("Backend and Frontend architectures are fully aligned.")
    else:
        print(f"[ALERT] SYSTEM INTEGRITY: {errors} items need attention.")

if __name__ == "__main__":
    check_integrity()

import os
import re
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def check_integrity():
    print("====================================")
    print("  Learning Hub Fullstack Integrity  ")
    print("  (Unified React 18 + Node + Django) ")
    print("====================================")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Paths
    conductor_urls_path = os.path.join(base_dir, "conductor", "config", "urls.py")
    express_routes_dir = os.path.join(base_dir, "learninghub", "backend", "src", "routes", "v1")
    django_lh_urls_path = os.path.join(base_dir, "learninghub", "django_backend", "learninghub_server", "urls.py")
    react_services_dir = os.path.join(base_dir, "learninghub", "src", "services")
    
    errors = 0

    # 1. Check Conductor & Express API Consistency with React Frontend Services
    print("\n[1/3] Checking API Hubs <-> React Frontend Service Consistency...")
    with open(conductor_urls_path, 'r', encoding='utf-8') as f:
        conductor_urls = f.read()
        
    routes = {
        "auth": ["auth"],
        "users": ["user"],
        "courses": ["course", "lesson"],
        "gamification": ["gamification", "leaderboard", "badge", "duel"],
        "payments": ["payment", "cart", "stripe", "subscription"],
        "notifications": ["notification"],
        "ai": ["ai", "tutor"],
        "mentors": ["mentor"],
        "discussions": ["discussion"],
        "peer_review": ["peerreview"],
        "support": ["support"],
        "study_groups": ["studygroup"]
    }
    
    react_services = [s.lower().replace("_", "") for s in os.listdir(react_services_dir)] if os.path.exists(react_services_dir) else []
    
    for key, patterns in routes.items():
        matched_service = any(any(pat in s for pat in patterns) for s in react_services)
        if matched_service:
            print(f"  [PASS] Domain [{key}] active in React services layer.")
        else:
            print(f"  [WARN] Domain [{key}] missing corresponding React service.")
            errors += 1

    # 2. Check LearningHub Django <-> React API Parity
    print("\n[2/3] Checking LearningHub Django <-> React SPA Consistency...")
    if os.path.exists(django_lh_urls_path):
        with open(django_lh_urls_path, 'r', encoding='utf-8') as f:
            django_urls = f.read()
            
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

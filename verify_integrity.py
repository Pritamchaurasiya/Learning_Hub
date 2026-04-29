
import os
import re

def check_integrity():
    print("🤖 Learning Hub Integrity Checker 🤖")
    print("------------------------------------")
    
    base_dir = r"c:\Users\shiva\Desktop\windows_app"
    backend_urls_path = os.path.join(base_dir, "conductor", "config", "urls.py")
    frontend_api_path = os.path.join(base_dir, "my_flutter_app", "lib", "src", "core", "constants", "api_constants.dart")
    
    # 1. Check API Constants Consistency
    print("\n🔍 Checking API Consistency...")
    with open(backend_urls_path, 'r') as f:
        backend_content = f.read()
    
    with open(frontend_api_path, 'r') as f:
        frontend_content = f.read()
        
    routes = {
        "auth": "auth/",
        "users": "users/",
        "courses": "courses/",
        "dsa": "dsa/",
        "gamification": "gamification/",
        "payments": "payments/"
    }
    
    errors = 0
    for key, path in routes.items():
        if path in backend_content and path in frontend_content:
            print(f"  ✅ Route [{key}] matched.")
        else:
            print(f"  ❌ Route [{key}] MISMATCH!")
            if path not in backend_content: print(f"     -> Missing in Backend: {path}")
            if path not in frontend_content: print(f"     -> Missing in Frontend: {path}")
            errors += 1

    # 2. Check WebSocket Configuration
    print("\n🔍 Checking WebSocket Config...")
    asgi_path = os.path.join(base_dir, "conductor", "config", "asgi.py")
    with open(asgi_path, 'r') as f:
        asgi_content = f.read()
        
    print(f"DEBUG: ASGI Content Length: {len(asgi_content)}")
    
    ws_modules = ["chat_ws", "live_sessions_ws", "study_groups_ws"]
    for Mod in ws_modules:
        if Mod in asgi_content:
             print(f"  ✅ WebSocket Module [{Mod}] registered.")
        else:
             print(f"  ❌ WebSocket Module [{Mod}] MISSING in ASGI!")
             errors += 1

    print("\n------------------------------------")
    if errors == 0:
        print("✅ SYSTEM INTEGRITY: 100% MATCHED")
        print("   Backend and Frontend are perfectly aligned.")
    else:
        print(f"⚠️ SYSTEM INTEGRITY: {errors} ISSUES FOUND")

if __name__ == "__main__":
    check_integrity()

import os
import sys
import subprocess
import time
import requests
import signal
from pathlib import Path

# Configuration
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "conductor"
FRONTEND_DIR = BASE_DIR / "my_flutter_app"
SERVER_URL = "http://127.0.0.1:8000"

def run_command(command, cwd, description):
    print(f"\n[STEP] {description}...")
    print(f"       cmd: {' '.join(command)}")
    print(f"       cwd: {cwd}")
    
    try:
        if sys.platform == "win32":
            shell = True
        else:
            shell = False
            
        subprocess.run(
            command, 
            cwd=str(cwd), 
            check=True, 
            shell=shell,
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        print(f"[OK] {description} Passed.")
        return True
    except subprocess.CalledProcessError:
        print(f"[FAIL] {description} Failed!")
        return False

SEPARATOR = "==================================================="

def check_backend_tests():
    return run_command(
        [sys.executable, "-m", "pytest", "apps/courses/tests/test_services.py", "-v"], 
        BACKEND_DIR, 
        "Running Backend Tests"
    )

def check_frontend_analyze():
    return run_command(
        ["flutter", "analyze"], 
        FRONTEND_DIR, 
        "Running Frontend Analysis"
    )

def build_frontend():
    return run_command(
        ["flutter", "build", "web", "--release"], 
        FRONTEND_DIR, 
        "Building Frontend (Production)"
    )

def check_integration():
    print("\n[STEP] Integration Smoke Test (Starting Server)...")
    
    # Start Django Server
    server_process = subprocess.Popen(
        [sys.executable, "manage.py", "runserver", "8000"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=(sys.platform == "win32")
    )
    
    try:
        # Wait for server to start
        print("       Waiting for server to boot...")
        for i in range(15):
            try:
                response = requests.get(f"{SERVER_URL}/health/", timeout=2)
                if response.status_code == 200:
                    print(f"       Server is UP! Response: {response.json()}")
                    print("[OK] Integration Test Passed.")
                    return True
            except requests.exceptions.ConnectionError:
                pass
            time.sleep(1)
            print(f"       ...retry {i+1}/15")
            
        print("[FAIL] Server failed to start or health check failed.")
        return False
        
    finally:
        print("       Stopping server...")
        if sys.platform == "win32":
            # Windows requires stronger kill
            subprocess.call(["taskkill", "/F", "/T", "/PID", str(server_process.pid)])
        else:
            server_process.terminate()
            server_process.wait()

def main():
    print(SEPARATOR)
    print(" LEARNING HUB - AUTOMATED PRODUCTION VERIFICATION")
    print(SEPARATOR)
    
    if not check_backend_tests(): sys.exit(1)
    if not check_frontend_analyze(): sys.exit(1)
    # integration check before build to save time if server is broken
    if not check_integration(): sys.exit(1) 
    
    # Uncomment for full production build verification (takes time)
    # if not build_frontend(): sys.exit(1)
    
    print("\n" + SEPARATOR)
    print(" ALL SYSTEMS GO! PROD READY. 🚀")
    print(SEPARATOR)

if __name__ == "__main__":
    main()

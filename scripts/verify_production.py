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
FRONTEND_DIR = BASE_DIR / "learninghub"
SERVER_URL = "http://127.0.0.1:8000"

def run_command(command, cwd, description):
    print(f"\n[STEP] {description}...")
    print(f"       cmd: {' '.join(command)}")
    print(f"       cwd: {cwd}")
    
    try:
        shell = sys.platform == "win32"
            
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
        ["npm", "run", "typecheck"], 
        FRONTEND_DIR, 
        "Running Frontend Analysis (TypeScript)"
    )

def build_frontend():
    return run_command(
        ["npm", "run", "build"], 
        FRONTEND_DIR, 
        "Building Frontend (React 18 + Vite)"
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
        print("       Waiting for server to be responsive...")
        max_retries = 15
        for i in range(max_retries):
            try:
                response = requests.get(f"{SERVER_URL}/admin/login/", timeout=2)
                if response.status_code == 200:
                    print("       Server responded 200 OK.")
                    break
            except requests.exceptions.RequestException:
                time.sleep(1)
        else:
            print("[FAIL] Server timed out without responding!")
            return False
            
        print("[OK] Integration Smoke Test Passed.")
        return True
    finally:
        # Stop Server
        print("       Terminating server...")
        if sys.platform == "win32":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(server_process.pid)], capture_output=True)
        else:
            server_process.terminate()
            server_process.wait()

def main():
    print(SEPARATOR)
    print("      PRODUCTION READINESS VERIFICATION PIPELINE")
    print("      Unified React 18 + Express + Django Stack")
    print(SEPARATOR)
    
    steps = [
        check_frontend_analyze,
        build_frontend,
        check_backend_tests,
        check_integration
    ]
    
    results = []
    for step in steps:
        success = step()
        results.append(success)
        if not success:
            print(f"\n[ABORT] Pipeline halted due to previous failure.")
            break
            
    print(f"\n{SEPARATOR}")
    if all(results) and len(results) == len(steps):
        print("  🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! 🎉")
        print("  The unified application is ready for production deployment.")
        print(SEPARATOR)
        sys.exit(0)
    else:
        print("  ❌ VERIFICATION CHECKS FAILED. FIX ISSUES BEFORE PROD. ❌")
        print(SEPARATOR)
        sys.exit(1)

if __name__ == "__main__":
    main()

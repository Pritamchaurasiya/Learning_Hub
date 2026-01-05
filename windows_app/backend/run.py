import os
import subprocess
import sys
import time

def main():
    print("==========================================")
    print("   LEARNING HUB GOD MODE BACKEND LAUNCHER")
    print("==========================================")
    print("Initializing Microservices...")

    # Define services to run
    services = [
        {"name": "Payment Service", "path": "payment_service/main.py", "port": 8080},
    ]

    processes = []

    try:
        for service in services:
            print(f"[*] Starting {service['name']} on port {service['port']}...")
            # Use python or python3 depending on environment
            cmd = [sys.executable, service['path']]
            # Run in a new shell/process
            p = subprocess.Popen(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
            processes.append(p)
            print(f"[+] {service['name']} started (PID: {p.pid})")

        print("\nAll systems nominal. API Gateway ready.")
        print("Press Ctrl+C to stop all services.")
        
        # Keep alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[!] Shutting down services...")
        for p in processes:
            p.terminate()
        print("[-] Shutdown complete.")

if __name__ == "__main__":
    main()

import os
import shutil
import subprocess
import sys
from pathlib import Path

# Paths
# Script is in scripts/deploy_god_mode.py
# BASE_DIR should be one level up: c:\Users\shiva\Desktop\windows_app
BASE_DIR = Path(__file__).resolve().parent.parent

# FLUTTER_APP_DIR: c:\Users\shiva\Desktop\windows_app\windows_app
FLUTTER_APP_DIR = BASE_DIR / "windows_app"

# DJANGO_APP_DIR: c:\Users\shiva\Desktop\windows_app\conductor
DJANGO_APP_DIR = BASE_DIR / "conductor"

STATIC_ROOT = DJANGO_APP_DIR / "staticfiles"
TEMPLATES_ROOT = DJANGO_APP_DIR / "templates"

def print_header(msg):
    print("\n" + "="*60)
    print(f" {msg}")
    print("="*60 + "\n")

def run_command(command, cwd=None, shell=True):
    # Fix: Ensure cwd is string if it's a Path object
    if cwd and isinstance(cwd, Path):
        cwd = str(cwd)
        
    print(f"[*] Running: {command} in {cwd or 'current dir'}")
    try:
        subprocess.check_call(command, cwd=cwd, shell=shell)
    except subprocess.CalledProcessError as e:
        print(f"[!] Error executing {command}: {e}")
        sys.exit(1)

def build_flutter_web():
    print_header("Building Flutter Web (God Mode)")
    
    # Check if flutter is available
    run_command("flutter --version", cwd=FLUTTER_APP_DIR)
    
    # 1. Clean
    run_command("flutter clean", cwd=FLUTTER_APP_DIR)
    
    # 2. Get Dependencies
    run_command("flutter pub get", cwd=FLUTTER_APP_DIR)
    
    # 3. Build Web (CanvasKit for performance, PWA enabled)
    # Using --release for optimization
    # --web-renderer canvaskit ensures consistent rendering
    # --base-href / ensures it works from root
    build_cmd = (
        "flutter build web --release "
        "--web-renderer canvaskit "
        "--base-href / "
        "--pwa-strategy offline-first "
        "--dart-define=FLUTTER_WEB_CANVASKIT_URL=https://unpkg.com/canvaskit-wasm@0.37.1/bin/ "
        "--dart-define=ENABLE_MOCK_MODE=false"
    )
    run_command(build_cmd, cwd=FLUTTER_APP_DIR)
    
    build_dir = FLUTTER_APP_DIR / "build" / "web"
    if not build_dir.exists():
        print("[!] Build directory not found. Build failed.")
        sys.exit(1)
        
    print("[+] Flutter Web Build Complete")
    return build_dir

def integrate_with_django(build_dir):
    print_header("Integrating with Django Conductor")
    
    # 1. Prepare Django Static Directories
    static_dest = STATIC_ROOT / "flutter"
    if static_dest.exists():
        shutil.rmtree(static_dest)
    os.makedirs(static_dest, exist_ok=True)
    
    # 2. Copy Assets to Static
    print(f"[*] Copying static assets to {static_dest}...")
    
    # Copy everything EXCEPT index.html to static
    for item in build_dir.iterdir():
        if item.name == "index.html":
            continue
            
        dest = static_dest / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)
            
    # 3. Process index.html for Django Templates
    print("[*] Processing index.html for Django Templates...")
    index_src = build_dir / "index.html"
    index_dest = TEMPLATES_ROOT / "index.html"
    
    os.makedirs(TEMPLATES_ROOT, exist_ok=True)
    
    with open(index_src, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Inject Django Static Tags
    # Replace <base href="/"> with Django static path if needed, or keep / if served from root
    # But usually, we want Flutter to look for assets in /static/flutter/
    
    # Strategy: Replace all relative paths in index.html to point to /static/flutter/
    # Or rely on <base href="/static/flutter/">? 
    # Better: Use simple replacement for key assets if base href strategy is complex with routing.
    # Actually, simpler is: Serve Flutter at Root URL via Nginx/Django, but assets are at /static/flutter/
    
    # Let's modify base href to be compatible with Django serving
    # content = content.replace('<base href="/" />', '<base href="/static/flutter/" />')
    
    # WAIT: Flutter Web Router (GoRouter) needs base href to match the route prefix. 
    # If app is at /, base href should be /.
    # But assets (main.dart.js) need to be found. 
    # We will use Django's 'white noise' or Nginx to map /main.dart.js to the right place?
    # NO, standard practice: Put everything in static, use index.html to point to them.
    
    # For now, simplistic approach: Copy index.html as is. 
    # Nginx/Django should serve static files from root or we adjust paths.
    
    # If using Django to serve index.html, it will look for 'main.dart.js' at root relative.
    # So if we visit localhost:8000/, it requests localhost:8000/main.dart.js.
    # Django static handling needs to serve this.
    # Simplest: Copy ALL build assets to a 'frontend' folder in staticfiles, 
    # and use Whitenoise to serve root files? Or just rely on Nginx in production.
    
    # GOD MODE DECISION: Production Deployment uses Nginx.
    # This script prepares files for Nginx.
    
    # Copy index.html to templates for Django to serve if needed (e.g. for auth-gated entry)
    shutil.copy2(index_src, index_dest)
    print(f"[+] index.html copied to {index_dest}")
    
    msg = """
    [SUCCESS] Integration Complete!
    
    Next Steps for Production:
    1. Configure Nginx to root /static/flutter/ for static assets.
    2. Configure Nginx to try_files $uri $uri/ /index.html for SPA routing.
    3. Run 'python manage.py collectstatic' in Conductor.
    """
    print(msg)

def main():
    print_header("LEARNING HUB - GOD MODE DEPLOYMENT")
    
    # 1. Build Flutter
    build_dir = build_flutter_web()
    
    # 2. Integrate
    integrate_with_django(build_dir)
    
if __name__ == "__main__":
    main()

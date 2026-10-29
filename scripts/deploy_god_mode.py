import os
import shutil
import subprocess
import sys
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
REACT_APP_DIR = BASE_DIR / "learninghub"
DJANGO_APP_DIR = BASE_DIR / "conductor"

STATIC_ROOT = DJANGO_APP_DIR / "staticfiles"
TEMPLATES_ROOT = DJANGO_APP_DIR / "templates"

def print_header(msg):
    print("\n" + "="*60)
    print(f" {msg}")
    print("="*60 + "\n")

def run_command(command, cwd=None, shell=True):
    if cwd and isinstance(cwd, Path):
        cwd = str(cwd)
        
    print(f"[*] Running: {command} in {cwd or 'current dir'}")
    try:
        subprocess.check_call(command, cwd=cwd, shell=shell)
    except subprocess.CalledProcessError as e:
        print(f"[!] Error running command: {e}")
        sys.exit(1)

def main():
    print_header("GOD MODE DEPLOYMENT: UNIFIED REACT + DJANGO")
    
    # 1. Build React Web
    print_header("Step 1: Building React 18 Web Frontend")
    run_command("npm run build", cwd=REACT_APP_DIR)
    
    build_dir = REACT_APP_DIR / "dist"
    if not build_dir.exists():
        print(f"[!] React build directory not found at: {build_dir}")
        sys.exit(1)
        
    # 2. Deploy Static Assets
    print_header("Step 2: Deploying Static Assets to Conductor")
    target_web_static = STATIC_ROOT / "web"
    if target_web_static.exists():
        shutil.rmtree(target_web_static)
    shutil.copytree(build_dir, target_web_static)
    print(f"[*] Copied {build_dir} to {target_web_static}")
    
    # Copy index.html to templates
    index_html = build_dir / "index.html"
    if index_html.exists():
        TEMPLATES_ROOT.mkdir(parents=True, exist_ok=True)
        shutil.copy2(index_html, TEMPLATES_ROOT / "index.html")
        print(f"[*] Copied index.html to {TEMPLATES_ROOT / 'index.html'}")
        
    # 3. Collectstatic in Django
    print_header("Step 3: Collecting Django Static Files")
    run_command(f"{sys.executable} manage.py collectstatic --noinput", cwd=DJANGO_APP_DIR)
    
    # 4. Success summary
    print_header("DEPLOYMENT COMPLETE")
    print("The unified React frontend has been built and integrated into Conductor.")
    print("Start server with: launch_desktop_app.bat or start_website.bat")

if __name__ == "__main__":
    main()

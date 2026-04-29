import os
import sys
import time

# Set path to current dir
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django
from django.conf import settings

print("Initializing Django settings...")
try:
    _ = settings.INSTALLED_APPS
    print("Settings loaded successfully.")
except Exception as e:
    print(f"Failed to load settings: {e}")
    sys.exit(1)

print("Starting app import diagnostics...")

def test_imports():
    # Manual setup similar to django.setup() but controlled
    from django.apps import apps
    
    # 1. Populate apps
    print("Populating apps...")
    try:
        apps.populate(settings.INSTALLED_APPS)
        print("Apps populated successfully.")
    except Exception as e:
        print(f"Failed to populate apps: {e}")
        # Try to identify which one failed if possible (hard with populate)
    
    # 2. Check each app config readiness (if populate succeeded or partially succeeded)
    print("\nChecking individual app readiness (if possible)...")
    for app_config in apps.get_app_configs():
        print(f"Checking app: {app_config.name}... ", end="", flush=True)
        try:
            # Trigger any ready() methods if not already done perfectly
            if not app_config.ready:
                 # ready() might be called by populate, but let's verify
                 pass
            print("OK")
        except Exception as e:
             print(f"FAILED: {e}")

if __name__ == "__main__":
    try:
        django.setup()
        print("\nDjango setup() completed successfully!")
    except Exception as e:
        print(f"\nDjango setup() crashed: {e}")
        import traceback
        traceback.print_exc()

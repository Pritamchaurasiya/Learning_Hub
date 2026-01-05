
import os
import django
import sys

# Set path to current dir
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

print("Attempting to setup Django...")
try:
    django.setup()
    print("Django setup successful!")
except Exception as e:
    print(f"Django setup FAILED: {e}")
    import traceback
    traceback.print_exc()

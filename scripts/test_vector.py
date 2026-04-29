
import os
import sys
import django

# Setup Django Environment
sys.path.append(r"c:\Users\shiva\Desktop\windows_app\conductor")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local") # or base?

try:
    django.setup()
except Exception as e:
    print(f"Django setup failed: {e}")
    # Continue if possible, or exit
    
from apps.ai_engine.ai_client import AIClient

def test_embedding():
    print("Testing Embedding Generation...")
    text = "Machine Learning is the future of education."
    try:
        vec = AIClient.generate_embedding(text)
        if vec:
            print(f"Success! Vector Dimension: {len(vec)}")
            print(f"First 5 values: {vec[:5]}")
        else:
            print("Failed to generate embedding (None returned).")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_embedding()

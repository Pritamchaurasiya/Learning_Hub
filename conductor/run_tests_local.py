import os
import django
import sys
from unittest import TestLoader, TextTestRunner

if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, r"c:\Users\shiva\Desktop\windows_app\conductor")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    try:
        django.setup()
    except Exception as e:
        print("DJANGO SETUP ERROR:", e)
        sys.exit(1)
        
    try:
        from apps.ai_engine.test_multimodal_reasoning import MultimodalReasoningTests
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

    loader = TestLoader()
    suite = loader.loadTestsFromTestCase(MultimodalReasoningTests)
    runner = TextTestRunner(verbosity=2)
    runner.run(suite)

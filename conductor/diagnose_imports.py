
import os
import sys
import traceback
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

print("1. Starting Django setup...")
try:
    django.setup()
    print("SUCCESS: Django setup complete.")
except Exception:
    print("FAILURE: Django setup failed.")
    traceback.print_exc()
    sys.exit(1)

print("\n2. Checking AI Engine views...")
try:
    from apps.ai_engine import views as ai_views
    print("SUCCESS: Imported apps.ai_engine.views")
    
    # Check for session adaptation endpoints
    expected_endpoints = [
        'record_session_attempt',
        'get_session_summary',
        'end_session',
        'get_user_model'
    ]
    
    for endpoint in expected_endpoints:
        if hasattr(ai_views, endpoint):
            print(f"  [OK] Found {endpoint}")
        else:
            print(f"  [MISSING] Could not find {endpoint}")
            
except Exception:
    print("FAILURE: Could not import apps.ai_engine.views")
    traceback.print_exc()

print("\n3. Checking Course views...")
try:
    from apps.courses import views as course_views
    print("SUCCESS: Imported apps.courses.views")
    
    if hasattr(course_views, 'CourseViewSet'):
        print("  [OK] Found CourseViewSet")
        if hasattr(course_views.CourseViewSet, 'key_concepts'):
            print("  [OK] Found CourseViewSet.key_concepts action")
        else:
            print("  [MISSING] CourseViewSet.key_concepts action not found")
    else:
        print("  [MISSING] CourseViewSet not found")
        
except Exception:
    print("FAILURE: Could not import apps.courses.views")
    traceback.print_exc()

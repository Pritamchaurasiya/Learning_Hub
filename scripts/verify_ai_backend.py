
import os
import sys
import django

sys.path.append(r"c:\Users\shiva\Desktop\windows_app\conductor")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

try:
    django.setup()
except Exception as e:
    print(f"Django Setup Failed: {e}")
    sys.exit(1)

from apps.ai_engine.ai_client import AIClient
from apps.ai_engine.models import CourseEmbedding
from apps.courses.models import Course
from django.contrib.contenttypes.models import ContentType

def verify_system():
    print("--- Verifying AI Backend ---")
    
    # 1. Test Embedding Generation
    print("[1] Generating Vector...")
    text = "Test Vector"
    vec = AIClient.generate_embedding(text)
    if not vec or len(vec) != 384:
        print(f"FAIL: Vector generation failed or wrong dim. Got {len(vec) if vec else 'None'}")
        return
    print(f"PASS: Vector generated (Dim: {len(vec)})")
    
    # 2. Test DB Persistence (Mocking a Course reference)
    print("[2] Saving to DB...")
    # Create a dummy course or find one
    try:
        user = django.contrib.auth.get_user_model().objects.first()
        if not user:
            print("SKIP DB: No users found to create course.")
            return

        course, _ = Course.objects.get_or_create(
            title="AI Test Course",
            defaults={'instructor': user, 'description': 'Test', 'level': 'Beginner'}
        )
        
        # Save Embedding
        CourseEmbedding.objects.update_or_create(
            content_type=ContentType.objects.get_for_model(Course),
            object_id=course.id,
            defaults={'chunk_text': text, 'embedding': vec}
        )
        
        # Verify Read
        obj = CourseEmbedding.objects.get(object_id=course.id)
        # Check if vector is stored (pgvector returns list or numpy)
        # Depending on adapter, it might be list.
        stored_vec = obj.embedding
        if len(stored_vec) == 384:
             print("PASS: Vector saved and retrieved correctly.")
        else:
             print(f"FAIL: Stored vector has wrong dim: {len(stored_vec)}")

    except Exception as e:
        print(f"FAIL: DB Error: {e}")

if __name__ == "__main__":
    verify_system()


import os
import django

# Setup Django
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.users.models import User
from apps.courses.models import Category, Course
from apps.content.models import Lesson

def setup():
    print("Setting up DSA Content...")
    
    # 1. Instructor
    user, _ = User.objects.get_or_create(
        email="instructor@learninghub.com",
        defaults={
            "username": "instructor",
            "is_staff": True,
            "is_superuser": True
        }
    )
    if _: user.set_password("password123"); user.save()
    print(f"Instructor: {user.email}")

    # 2. Categories
    cs_cat, _ = Category.objects.get_or_create(
        slug="computer-science",
        defaults={"name": "Computer Science", "description": "Core CS", "icon": "computer", "order": 1}
    )
    
    dsa_cat, _ = Category.objects.get_or_create(
        slug="dsa",
        defaults={"name": "Data Structures & Algorithms", "parent": cs_cat, "description": "Master DSA", "icon": "code", "order": 1}
    )
    print("Categories created.")

    # 3. Course
    course, _ = Course.objects.get_or_create(
        slug="dsa-mastery",
        defaults={
            "title": "DSA Mastery: From Zero to Hero",
            "description": "Comprehensive DSA Guide.",
            "short_description": "Master DSA.",
            "instructor": user,
            "category": dsa_cat,
            "is_published": True,
            "difficulty": "intermediate",
            "price": 0
        }
    )
    print(f"Course created: {course.title}")

    # 4. Lessons
    lessons_data = [
        ("Introduction to Complexity", "text", "# Big O\nTime and Space complexity..."),
        ("Arrays and Strings", "text", "# Arrays\nSliding Window, Two Pointers..."),
        ("Linked Lists", "text", "# Linked Lists\nReversal, Cycle Detection..."),
    ]

    for i, (title, ltype, content) in enumerate(lessons_data, 1):
        Lesson.objects.get_or_create(
            course=course,
            title=title,
            defaults={
                "order": i,
                "content_type": ltype,
                "text_content": content,
                "is_published": True
            }
        )
    print("Lessons created.")
    print("DSA Content Setup Complete!")

if __name__ == '__main__':
    setup()

import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection, reset_queries
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User

@pytest.mark.django_db
def test_category_list_performance():
    client = APIClient()

    # Create test data
    user = User.objects.create_user(email="test@example.com", password="StrongPassword123!")

    # Create 5 root categories
    for i in range(5):
        parent = Category.objects.create(name=f"Root {i}", is_active=True)
        # Create 3 subcategories for each
        for j in range(3):
            sub = Category.objects.create(name=f"Sub {i}-{j}", parent=parent, is_active=True)
            # Create 2 courses for each subcategory
            Course.objects.create(
                title=f"Course {i}-{j}-1",
                category=sub,
                instructor=user,
                is_published=True
            )
            Course.objects.create(
                title=f"Course {i}-{j}-2",
                category=sub,
                instructor=user,
                is_published=True
            )
        # Create 2 courses for root
        Course.objects.create(
            title=f"Course Root {i}-1",
            category=parent,
            instructor=user,
            is_published=True
        )

    # Clear any previous queries
    reset_queries()

    with CaptureQueriesContext(connection) as context:
        response = client.get("/api/v1/courses/categories/")
        assert response.status_code == 200

    query_count = len(context.captured_queries)
    print(f"\nQuery count: {query_count}")

    # We expect a high number of queries initially
    # If optimized, it should be significantly lower (e.g., constant or linear to depth, not total nodes)

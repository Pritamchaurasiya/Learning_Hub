import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.courses.models import Category, Course
from apps.users.models import User

@pytest.mark.django_db
def test_category_list_performance(client):
    """
    Test to reproduce N+1 query issue in Category list endpoint.
    """
    # Setup
    instructor = User.objects.create_user(
        email="inst@example.com",
        password="password",
        username="inst"
    )

    # Create 5 root categories
    for i in range(5):
        parent = Category.objects.create(name=f"Parent {i}", slug=f"parent-{i}")

        # Create 2 courses for the parent category itself
        Course.objects.create(
            title=f"Course Parent {i}-1",
            slug=f"course-parent-{i}-1",
            instructor=instructor,
            category=parent,
            is_published=True
        )
        Course.objects.create(
            title=f"Course Parent {i}-2",
            slug=f"course-parent-{i}-2",
            instructor=instructor,
            category=parent,
            is_published=True
        )

        # Create 2 subcategories for each
        for j in range(2):
            sub = Category.objects.create(name=f"Sub {i}-{j}", slug=f"sub-{i}-{j}", parent=parent)
            # Create 2 courses for each subcategory
            Course.objects.create(
                title=f"Course {i}-{j}-1",
                slug=f"course-{i}-{j}-1",
                instructor=instructor,
                category=sub,
                is_published=True
            )
            Course.objects.create(
                title=f"Course {i}-{j}-2",
                slug=f"course-{i}-{j}-2",
                instructor=instructor,
                category=sub,
                is_published=True
            )

    # Measure queries
    # The URL for CategoryViewSet list is /api/v1/courses/categories/
    url = "/api/v1/courses/categories/"

    with CaptureQueriesContext(connection) as ctx:
        response = client.get(url)

    assert response.status_code == 200

    num_queries = len(ctx.captured_queries)
    print(f"\nNumber of queries: {num_queries}")

    # Asserting N+1 behavior is resolved.
    # Expected queries:
    # 1. Main query for parents (with annotation)
    # 2. Prefetch query for subcategories (with annotation)
    # 3. Prefetch query for grandchildren (with annotation)
    # + Potential overhead (user auth etc) ~ 1-2 queries.
    # Should be constant regardless of number of categories.
    assert num_queries < 10, f"Expected < 10 queries, got {num_queries}. N+1 issue persists."

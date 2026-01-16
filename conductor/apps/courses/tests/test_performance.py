import pytest
from django.urls import reverse
from rest_framework import status
from apps.courses.models import Category, Course
from apps.users.models import User
from django.test.utils import CaptureQueriesContext
from django.db import connection

@pytest.mark.django_db
def test_category_list_performance(api_client):
    # Create instructor
    instructor = User.objects.create_user(email="inst@example.com", password="password")

    # Create categories
    parents = []
    for i in range(5):
        p = Category.objects.create(name=f"Parent {i}", slug=f"parent-{i}")
        parents.append(p)
        # Create subcategories
        for j in range(3):
            Category.objects.create(name=f"Sub {i}-{j}", slug=f"sub-{i}-{j}", parent=p)

        # Create courses
        Course.objects.create(title=f"C{i}", instructor=instructor, category=p, is_published=True)

    url = reverse("category-list")

    # Warm up to avoid startup overhead
    api_client.get(url)

    # Reset queries
    from django.db import reset_queries
    reset_queries()

    with CaptureQueriesContext(connection) as ctx:
        response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK

    query_count = len(ctx.captured_queries)
    print(f"\nCaptured Queries: {query_count}")

    # With 5 parents, we expect:
    # 1 query for parents list
    # 5 queries for subcategories (1 per parent)
    # 5 queries for course count (1 per parent)
    # Total ~ 11 queries + potentially auth related ones.

    # With optimization, this should be drastically reduced.
    # Expected: 1 main query + 1 prefetch for L1 + 1 prefetch for L2 = 3 queries.
    # Plus potential auth/setup queries.
    # Previously it was ~42 queries.
    assert query_count < 10

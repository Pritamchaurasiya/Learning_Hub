import pytest
from rest_framework import status
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.courses.models import Category, Course
from apps.users.models import User


@pytest.mark.django_db
def test_category_list_performance(api_client):
    # Setup data
    instructor = User.objects.create_user(email="inst@test.com", password="password")

    # Create 3 Roots
    for r in range(3):
        root = Category.objects.create(name=f"Root {r}")
        Course.objects.create(
            title=f"Course R{r}",
            instructor=instructor,
            category=root,
            is_published=True,
        )

        # Create 3 Children for each Root
        for c in range(3):
            child = Category.objects.create(name=f"Child {r}-{c}", parent=root)
            Course.objects.create(
                title=f"Course C{r}-{c}",
                instructor=instructor,
                category=child,
                is_published=True,
            )

            # Create 3 Grandchildren for each Child
            for g in range(3):
                grand = Category.objects.create(name=f"Grand {r}-{c}-{g}", parent=child)
                Course.objects.create(
                    title=f"Course G{r}-{c}-{g}",
                    instructor=instructor,
                    category=grand,
                    is_published=True,
                )

    with CaptureQueriesContext(connection) as ctx:
        response = api_client.get("/api/v1/courses/categories/")
        assert response.status_code == status.HTTP_200_OK

    print(f"\nCaptured Queries: {len(ctx.captured_queries)}")

    # Assert optimized behavior (low query count)
    # Expected:
    # 1. Main query for Roots
    # 2. Prefetch query for Children
    # 3. Prefetch query for Grandchildren
    # Total ~ 3-5 queries
    assert len(ctx.captured_queries) < 10

import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection, reset_queries
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User

@pytest.mark.django_db
def test_category_list_performance(django_assert_max_num_queries):
    # Setup
    client = APIClient()
    instructor = User.objects.create_user(
        email="instructor@example.com",
        username="instructor",
        password="password",
        role=User.Role.INSTRUCTOR
    )

    # Create 5 top-level categories
    for i in range(5):
        parent = Category.objects.create(name=f"Parent {i}", slug=f"parent-{i}")

        # Create 3 subcategories for each
        for j in range(3):
            sub = Category.objects.create(
                name=f"Sub {i}-{j}",
                slug=f"sub-{i}-{j}",
                parent=parent
            )

            # Create 2 courses for each subcategory
            for k in range(2):
                Course.objects.create(
                    title=f"Course {i}-{j}-{k}",
                    slug=f"course-{i}-{j}-{k}",
                    instructor=instructor,
                    category=sub,
                    is_published=True
                )

    # Also create some courses for parents
    for cat in Category.objects.filter(parent__isnull=True):
        Course.objects.create(
             title=f"Parent Course {cat.slug}",
             slug=f"parent-course-{cat.slug}",
             instructor=instructor,
             category=cat,
             is_published=True
        )

    reset_queries()

    # Measure queries
    with CaptureQueriesContext(connection) as ctx:
        response = client.get("/api/v1/courses/categories/")
        assert response.status_code == 200

    print(f"\n\nTotal queries: {len(ctx.captured_queries)}")

    # Without optimization, this will likely be high.
    # 1 query for parents
    # For each parent (5):
    #   1 query for subcategories
    #   1 query for course count
    #   For each subcategory (3):
    #       1 query for sub-subcategories (recursion)
    #       1 query for course count
    #
    # Total roughly: 1 + 5 * (2 + 3 * (2)) = 1 + 5 * 8 = 41 queries?
    # Actually recursion depth might be deeper if we don't limit it, but data is only 2 levels.
    #
    # Let's fail if it's high to confirm the issue.
    # 4 queries should be enough with optimization (1 main + prefetch/annotations)

    assert len(ctx.captured_queries) < 10, f"Too many queries: {len(ctx.captured_queries)}"

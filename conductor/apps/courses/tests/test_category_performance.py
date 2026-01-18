import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.courses.models import Category, Course
from apps.users.models import User


@pytest.mark.django_db
def test_category_list_performance(api_client):
    # Setup: Create 5 root categories
    # Each with 5 subcategories
    # Each subcategory has 2 courses

    instructor = User.objects.create_user(
        email="instructor@example.com", password="password"
    )

    for i in range(5):
        root = Category.objects.create(name=f"Root {i}", is_active=True)
        for j in range(5):
            sub = Category.objects.create(
                name=f"Sub {i}-{j}", parent=root, is_active=True
            )
            for k in range(2):
                Course.objects.create(
                    title=f"Course {i}-{j}-{k}",
                    category=sub,
                    is_published=True,
                    instructor=instructor,
                    description="Test description",
                    short_description="Test short",
                )

    url = "/api/v1/courses/categories/"

    # Warmup
    api_client.get(url)

    # Clear queries
    connection.queries_log.clear()

    with CaptureQueriesContext(connection) as ctx:
        response = api_client.get(url)

    assert response.status_code == 200

    # Expected N+1 Calculation:
    # 1 query to fetch root categories
    # For each root (5):
    #   1 query for subcategories
    #   1 query for course_count
    # For each subcategory (25):
    #   1 query for sub-subcategories (empty)
    #   1 query for course_count

    # Total = 1 + 5*2 + 25*2 = 1 + 10 + 50 = 61 queries

    query_count = len(ctx.captured_queries)
    print(f"\nQuery count: {query_count}")

    # Assert that we have N+1 problem
    # With optimization, it should be constant or much lower (e.g., 3-4 queries)
    assert query_count < 10, f"Query count {query_count} is too high, N+1 still exists!"

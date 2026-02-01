import pytest
from django.urls import reverse
from rest_framework import status
from apps.courses.models import Category, Course
from django.test.utils import CaptureQueriesContext
from django.db import connection

@pytest.mark.django_db
class TestCategoryPerformance:

    @pytest.fixture
    def instructor(self, user_factory):
        return user_factory(email="inst@test.com", username="inst", password="password")

    def test_category_list_query_count(self, api_client, instructor):
        # Create hierarchy: 3 Roots, each has 3 Children, each has 3 Grandchildren
        # Total: 3 + 9 + 27 = 39 categories.
        # Also add courses to some categories to trigger course_count query.

        for i in range(3):
            root = Category.objects.create(name=f"Root {i}", is_active=True)
            Course.objects.create(title=f"Course Root {i}", instructor=instructor, category=root, is_published=True)

            for j in range(3):
                child = Category.objects.create(name=f"Child {i}-{j}", parent=root, is_active=True)
                Course.objects.create(title=f"Course Child {i}-{j}", instructor=instructor, category=child, is_published=True)

                for k in range(3):
                    grandchild = Category.objects.create(name=f"Grandchild {i}-{j}-{k}", parent=child, is_active=True)
                    Course.objects.create(title=f"Course Grandchild {i}-{j}-{k}", instructor=instructor, category=grandchild, is_published=True)

        url = reverse("category-list")

        # Verify query count
        with CaptureQueriesContext(connection) as ctx:
            response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        print(f"\nQuery count: {len(ctx.captured_queries)}")

        # We expect this to fail if N+1 is present.
        # With current implementation, it should be high.
        # We want it to be low (e.g. < 10)
        assert len(ctx.captured_queries) < 10, f"Too many queries: {len(ctx.captured_queries)}"

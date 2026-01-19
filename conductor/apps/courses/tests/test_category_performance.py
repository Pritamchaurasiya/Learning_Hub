import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.courses.models import Category, Course
from apps.users.models import User


@pytest.mark.django_db
class TestCategoryPerformance:
    def test_category_list_query_count(self):
        # Setup data
        instructor = User.objects.create_user(
            username="instructor", email="inst@test.com", password="StrongPassword123!"
        )

        # Create 3 root categories
        for i in range(3):
            root = Category.objects.create(name=f"Root {i}", is_active=True)
            # Create 3 courses for root
            for j in range(3):
                Course.objects.create(
                    title=f"Root Course {i}-{j}",
                    instructor=instructor,
                    category=root,
                    is_published=True,
                )

            # Create 3 subcategories
            for k in range(3):
                sub = Category.objects.create(
                    name=f"Sub {i}-{k}", parent=root, is_active=True
                )
                # Create 3 courses for sub
                for m in range(3):
                    Course.objects.create(
                        title=f"Sub Course {i}-{k}-{m}",
                        instructor=instructor,
                        category=sub,
                        is_published=True,
                    )

        client = APIClient()
        url = reverse("category-list")

        # Warmup
        client.get(url)

        with CaptureQueriesContext(connection) as context:
            response = client.get(url)

        assert response.status_code == 200

        # We expect a low number of queries.
        # Optimized: 1 root + 1 prefetch level 2 + 1 prefetch level 3 + auth = 4
        query_count = len(context.captured_queries)
        print(f"\nQuery count: {query_count}")

        # Assert queries are optimized (< 10 is a safe upper bound, previously 26)
        assert (
            query_count < 10
        ), f"Too many queries: {query_count}. N+1 problem detected."

    def test_category_retrieve_subcategory(self):
        """Verify that subcategories can be retrieved individually."""
        root = Category.objects.create(name="Root", is_active=True)
        sub = Category.objects.create(name="Sub", parent=root, is_active=True)

        client = APIClient()
        url = reverse("category-detail", args=[sub.slug])

        response = client.get(url)
        assert response.status_code == 200
        assert str(response.data["id"]) == str(sub.id)

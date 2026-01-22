import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from apps.courses.models import Category, Course
from apps.users.models import User
from django.test.utils import CaptureQueriesContext
from django.db import connection

@pytest.mark.django_db
class TestCategoryPerformance:
    def setup_method(self):
        self.client = APIClient()
        self.url = reverse('category-list')

    def test_category_list_performance(self):
        # Create a user for instructor
        instructor = User.objects.create_user(
            email="instructor@example.com",
            username="instructor",
            password="StrongPassword123!"
        )

        # Create categories and subcategories
        for i in range(5):
            parent = Category.objects.create(name=f"Parent {i}", slug=f"parent-{i}")
            for j in range(3):
                sub = Category.objects.create(
                    name=f"Sub {i}-{j}",
                    slug=f"sub-{i}-{j}",
                    parent=parent
                )
                # Add courses to subcategory
                for k in range(2):
                    Course.objects.create(
                        title=f"Course {i}-{j}-{k}",
                        slug=f"course-{i}-{j}-{k}",
                        category=sub,
                        instructor=instructor,
                        is_published=True
                    )

        # Capture queries
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(self.url)

        # Verify response structure (sanity check)
        assert response.status_code == 200
        results = response.data.get('data', response.data)
        if isinstance(results, dict) and 'results' in results:
             results = results['results'] # Handle standard pagination if different

        assert len(results) == 5

        print(f"\nNumber of queries: {len(ctx.captured_queries)}")
        # for i, query in enumerate(ctx.captured_queries):
        #     print(f"{i}: {query['sql']}")

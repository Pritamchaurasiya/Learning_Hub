import pytest
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User
from django.test.utils import CaptureQueriesContext
from django.db import connection

@pytest.mark.django_db
class TestCategoryPerformance:

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def setup_data(self):
        instructor = User.objects.create_user(
            email="inst@test.com", username="inst", password="password"
        )

        # Create hierarchy: Root -> Child -> Grandchild
        for i in range(3):
            root = Category.objects.create(name=f"Root {i}", slug=f"root-{i}")
            Course.objects.create(title=f"Course Root {i}", instructor=instructor, category=root, is_published=True)

            for j in range(3):
                child = Category.objects.create(name=f"Child {i}-{j}", slug=f"child-{i}-{j}", parent=root)
                Course.objects.create(title=f"Course Child {i}-{j}", instructor=instructor, category=child, is_published=True)

                for k in range(3):
                    grandchild = Category.objects.create(name=f"Grandchild {i}-{j}-{k}", slug=f"grandchild-{i}-{j}-{k}", parent=child)
                    Course.objects.create(title=f"Course Grandchild {i}-{j}-{k}", instructor=instructor, category=grandchild, is_published=True)

    def test_category_list_query_count(self, api_client, setup_data):
        url = "/api/v1/courses/categories/"

        # Warmup (optional, but good practice to avoid startup overhead)
        api_client.get(url)

        with CaptureQueriesContext(connection) as context:
            response = api_client.get(url)

        assert response.status_code == 200

        # With 3 roots, 3 children each, 3 grandchildren each.
        # 3 roots.
        # 3 * 3 = 9 children.
        # 9 * 3 = 27 grandchildren.
        # Total 39 categories.

        # Unoptimized:
        # 1 (roots)
        # + 3 (subcats of roots) + 3 (counts of roots) = 6
        # + 9 (subcats of children) + 9 (counts of children) = 18
        # + 27 (subcats of grandchildren) + 27 (counts of grandchildren) = 54
        # Total ~ 1 + 6 + 18 + 54 = 79 queries.

        # Optimized should be constant, around 4-6 queries depending on prefetch depth.

        # With optimizations, query count should be minimal (Roots + L2 + L3 + L4 + count/setup)
        # Expected around 4-5 queries.
        assert len(context) <= 6, f"Too many queries: {len(context)}"

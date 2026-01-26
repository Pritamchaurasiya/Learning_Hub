import pytest
from rest_framework.test import APIClient
from apps.courses.models import Category
from django.urls import reverse
from django.db import connection, reset_queries

@pytest.mark.django_db
class TestCategoryPerformance:
    def test_category_list_query_count(self, django_assert_num_queries):
        client = APIClient()

        # Create parent categories
        for i in range(5):
            parent = Category.objects.create(name=f"Parent {i}", slug=f"parent-{i}")
            # Create subcategories
            for j in range(3):
                Category.objects.create(name=f"Sub {i}-{j}", slug=f"sub-{i}-{j}", parent=parent)

        url = reverse("category-list")

        reset_queries()

        # Queries:
        # 1. Pagination count
        # 2. Root list
        # 3. Level 1 prefetch
        # 4. Level 2 prefetch
        with django_assert_num_queries(4):
             client.get(url)

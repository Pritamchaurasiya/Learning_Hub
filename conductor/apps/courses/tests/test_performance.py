import pytest
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User

@pytest.mark.django_db
class TestCategoryPerformance:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="test@example.com", password="password")

    def create_hierarchy(self, roots=1, children_per_node=1, depth=2):
        """
        Creates a category hierarchy.
        depth=0 means just roots.
        depth=1 means roots + children.
        depth=2 means roots + children + grandchildren.
        """
        def create_recursive(parent, current_depth):
            if current_depth >= depth:
                return

            for i in range(children_per_node):
                name = f"{parent.name}-{i}" if parent else f"Root-{i}"
                slug = f"{parent.slug}-{i}" if parent else f"root-{i}"
                cat = Category.objects.create(name=name, slug=slug, parent=parent)

                # Create a course to trigger course_count check
                Course.objects.create(
                    title=f"Course {cat.name}",
                    instructor=self.user,
                    category=cat,
                    is_published=True
                )

                create_recursive(cat, current_depth + 1)

        for i in range(roots):
            name = f"Root-{i}"
            slug = f"root-{i}"
            root = Category.objects.create(name=name, slug=slug, parent=None)
            Course.objects.create(
                title=f"Course {root.name}",
                instructor=self.user,
                category=root,
                is_published=True
            )
            create_recursive(root, 0)

    def test_category_list_constant_queries(self, django_assert_num_queries):
        # Create a hierarchy
        # 2 roots, 2 children each, 2 grandchildren each
        self.create_hierarchy(roots=2, children_per_node=2, depth=2)

        # With optimization, we expect constant queries regardless of size (for fixed depth).
        # Queries:
        # 1. Roots (filtered by parent__isnull=True)
        # 2. Level 1 subcategories
        # 3. Level 2 subcategories
        # 4. Level 3 subcategories
        # 5. Level 4 subcategories (prefetched even if empty)
        # Total = 5 queries.

        with django_assert_num_queries(5):
             response = self.client.get("/api/v1/courses/categories/")
             assert response.status_code == 200

    def test_category_list_constant_queries_larger_scale(self, django_assert_num_queries):
        # Even with more categories, query count should remain the same
        self.create_hierarchy(roots=5, children_per_node=3, depth=2)

        with django_assert_num_queries(5):
             response = self.client.get("/api/v1/courses/categories/")
             assert response.status_code == 200
             data = response.json()

             # Check if response is wrapped or list
             if isinstance(data, dict) and 'results' in data:
                 # Pagination
                 results = data['results']
             elif isinstance(data, list):
                 results = data
             else:
                 # Possibly wrapped in custom format, based on failure log: {'data': [...], 'status': ...}
                 # But standard DRF with pagination returns {count, next, previous, results}
                 # Let's handle the case if it's inside 'data' key or 'results' key
                 results = data.get('results', data.get('data', data))

             assert len(results) == 5 # 5 roots

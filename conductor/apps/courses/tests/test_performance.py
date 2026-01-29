import pytest
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User
from django.test.utils import CaptureQueriesContext
from django.db import connection


@pytest.mark.django_db
class TestCategoryPerformance:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="instructor@test.com", username="instructor", password="password"
        )
        self.url = "/api/v1/courses/categories/"

    def create_category_tree(self, breadth=3, depth=2):
        """
        Creates a tree of categories.
        breadth: Number of children per node.
        depth: Depth of the tree (0 means just roots).
        """
        roots = []
        for i in range(breadth):
            root = Category.objects.create(name=f"Root {i}", order=i)
            self._create_children(root, breadth, depth - 1)
            roots.append(root)
        return roots

    def _create_children(self, parent, breadth, depth):
        if depth < 0:
            return
        for i in range(breadth):
            child = Category.objects.create(
                name=f"{parent.name} - Child {i}",
                parent=parent,
                order=i
            )
            # Add some courses to make course_count do work
            Course.objects.create(
                title=f"Course for {child.name}",
                instructor=self.user,
                category=child,
                is_published=True
            )
            self._create_children(child, breadth, depth - 1)

    def test_category_list_performance(self):
        # Create a small tree: 3 roots, each having 3 children. 3*3 = 9 children.
        # 3 roots + 9 children = 12 categories.
        # Create courses for children.
        self.create_category_tree(breadth=3, depth=1)

        # Expected queries:
        # 1. Main query for roots (3 items)
        # 2. For each root:
        #    a. Query for subcategories (1 query)
        #    b. Query for course count (1 query)
        # 3. For each subcategory (9 items):
        #    a. Query for subcategories (1 query) - even if empty
        #    b. Query for course count (1 query)

        # Total approx: 1 + 3*(1+1) + 9*(1+1) = 1 + 6 + 18 = 25 queries.

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(self.url)

        assert response.status_code == 200
        print(f"\nNumber of queries: {len(ctx.captured_queries)}")

        # With optimization, we expect significantly fewer queries.
        # Ideally:
        # 1 query for roots + prefetch subcategories (1 query) +
        # (maybe) prefetch sub-subcategories if we go deeper.
        # course_count should be annotated.

        # We expect around 4 queries (1 root + 1 level1 + 1 level2 + 1 count/overhead)
        assert len(ctx.captured_queries) < 10, (
            f"Too many queries: {len(ctx.captured_queries)}"
        )

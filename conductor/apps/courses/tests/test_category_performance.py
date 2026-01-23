import pytest
from django.test.utils import CaptureQueriesContext
from django.db import connection
from apps.courses.models import Category, Course
from apps.courses.serializers import CategorySerializer
from apps.courses.views import CategoryViewSet
from apps.users.models import User


@pytest.mark.django_db
class TestCategoryPerformance:
    def test_n_plus_one_category_list(self):
        # Setup data
        instructor = User.objects.create_user(
            email="inst@test.com", username="inst", password="password"
        )

        # Create 3 parent categories
        parents = []
        for i in range(3):
            p = Category.objects.create(name=f"Parent {i}", slug=f"parent-{i}")
            parents.append(p)

            # Create 3 subcategories for each parent
            for j in range(3):
                sub = Category.objects.create(
                    name=f"Sub {i}-{j}", slug=f"sub-{i}-{j}", parent=p
                )

                # Create 2 courses for each subcategory
                for k in range(2):
                    Course.objects.create(
                        title=f"Course {i}-{j}-{k}",
                        description="Desc",
                        instructor=instructor,
                        category=sub,
                        is_published=True,
                    )

            # Create 2 courses for parent category
            for k in range(2):
                Course.objects.create(
                    title=f"Course {i}-{k}",
                    description="Desc",
                    instructor=instructor,
                    category=p,
                    is_published=True,
                )

        # Retrieve categories using ViewSet's logic
        view = CategoryViewSet()
        view.action = "list"
        queryset = view.get_queryset()

        # Measure queries
        with CaptureQueriesContext(connection) as ctx:
            data = CategorySerializer(queryset, many=True).data
            # Force evaluation
            assert len(data) == 3
            assert len(data[0]["subcategories"]) == 3

        print(f"\nNumber of queries: {len(ctx.captured_queries)}")
        assert len(ctx.captured_queries) <= 3

import pytest
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User

@pytest.mark.django_db
def test_category_list_performance(django_assert_num_queries):
    client = APIClient()

    # Create instructor
    instructor = User.objects.create_user(
        email="inst@example.com",
        username="inst",
        password="password",
        role=User.Role.INSTRUCTOR
    )

    # Create Category Hierarchy
    root1 = Category.objects.create(name="Root 1", slug="root-1")
    child1 = Category.objects.create(name="Child 1", slug="child-1", parent=root1)
    grandchild1 = Category.objects.create(name="Grandchild 1", slug="grandchild-1", parent=child1)

    root2 = Category.objects.create(name="Root 2", slug="root-2")

    # Create Courses
    def create_course(title, category):
        Course.objects.create(
            title=title,
            description="Desc",
            short_description="Short",
            instructor=instructor,
            category=category,
            is_published=True
        )

    create_course("C1", root1)
    create_course("C2", child1)
    create_course("C3", grandchild1)
    create_course("C4", root2)

    url = "/api/v1/courses/categories/"

    # With optimization, we expect constant queries (approx 4-5)
    # 1. Main list query
    # 2. Prefetch children
    # 3. Prefetch grandchildren
    # 4. Count query (pagination)
    with django_assert_num_queries(5):
        response = client.get(url)
        assert response.status_code == 200

import pytest
from rest_framework import status
from apps.courses.models import Category, Course
from apps.users.models import User

@pytest.mark.django_db
def test_category_list_performance(api_client, django_assert_num_queries):
    # Setup - Create hierarchy
    # Root 1
    #  - Child 1.1
    #    - GrandChild 1.1.1
    # Root 2
    #  - Child 2.1

    root1 = Category.objects.create(name="Root 1")
    root2 = Category.objects.create(name="Root 2")

    child1_1 = Category.objects.create(name="Child 1.1", parent=root1)
    child2_1 = Category.objects.create(name="Child 2.1", parent=root2)

    grandchild1_1_1 = Category.objects.create(name="GrandChild 1.1.1", parent=child1_1)

    # Create some courses to trigger the count query
    instructor = User.objects.create(email="inst@example.com", password="pass")
    Course.objects.create(title="C1", instructor=instructor, category=root1, is_published=True)
    Course.objects.create(title="C2", instructor=instructor, category=child1_1, is_published=True)
    Course.objects.create(title="C3", instructor=instructor, category=grandchild1_1_1, is_published=True)

    # URL
    url = "/api/v1/courses/categories/"

    # Current behavior estimation:
    # 1 (Root fetch)
    # Root 1: 1 (subs) + 1 (count) = 2
    #   Child 1.1: 1 (subs) + 1 (count) = 2
    #     GrandChild 1.1.1: 1 (subs) + 1 (count) = 2
    # Root 2: 1 (subs) + 1 (count) = 2
    #   Child 2.1: 1 (subs) + 1 (count) = 2
    # With optimization:
    # 1. Fetch roots (annotated)
    # 2. Prefetch Level 1 (annotated)
    # 3. Prefetch Level 2 (annotated)
    # 4. Prefetch Level 3 (annotated)
    # + 1 potential overhead query
    # Total: 5 queries regardless of the number of categories

    with django_assert_num_queries(5):
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

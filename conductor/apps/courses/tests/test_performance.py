import pytest
from rest_framework.test import APIClient
from apps.courses.models import Category, Course
from apps.users.models import User


@pytest.mark.django_db
def test_category_list_performance(django_assert_num_queries):
    client = APIClient()

    # Create instructor
    instructor = User.objects.create_user(
        email="inst@example.com", password="pw", display_name="Inst"
    )

    # Create hierarchy: 5 Roots, each has 3 children, each child has 2 grandchildren
    # Total categories: 5 + 5*3 + 5*3*2 = 5 + 15 + 30 = 50 categories.
    for r in range(5):
        root = Category.objects.create(name=f"Root {r}", is_active=True)
        Course.objects.create(
            title=f"Course R{r}",
            instructor=instructor,
            category=root,
            is_published=True,
        )

        for c in range(3):
            child = Category.objects.create(
                name=f"Child {r}-{c}", parent=root, is_active=True
            )
            Course.objects.create(
                title=f"Course C{r}-{c}",
                instructor=instructor,
                category=child,
                is_published=True,
            )

            for g in range(2):
                grand = Category.objects.create(
                    name=f"Grand {r}-{c}-{g}", parent=child, is_active=True
                )
                Course.objects.create(
                    title=f"Course G{r}-{c}-{g}",
                    instructor=instructor,
                    category=grand,
                    is_published=True,
                )

    # Currently we expect N+1 queries.
    # We set a strict limit to force a failure and see the actual count.
    # Ideally, with optimization, it should be constant (around 4-6 queries).
    # Without optimization, it will be much higher.
    # 1 (root list) + 5 (root subs) + 5 (root counts) + 15 (child subs) + ...

    # With optimization, it should be constant (around 4-6 queries).
    # 102 queries -> ~5 queries.
    with django_assert_num_queries(5):
        response = client.get("/api/v1/courses/categories/")
        assert response.status_code == 200

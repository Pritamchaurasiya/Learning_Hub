"""
Pytest fixtures for Learning Hub Backend tests.
"""

import pytest


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def create_user(db):
    """Factory fixture to create users."""
    from apps.users.models import User

    def _create_user(
        email="test@example.com", username="testuser", password="TestPass123!", **kwargs
    ):
        return User.objects.create_user(
            email=email, username=username, password=password, **kwargs
        )

    return _create_user


@pytest.fixture
def authenticated_client(api_client, create_user):
    """Return an API client with an authenticated user."""
    user = create_user()
    client = api_client
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_client(api_client, create_user):
    """Return an API client with an authenticated admin user."""
    from apps.users.models import User

    user = create_user()
    user.role = User.Role.ADMIN
    user.is_staff = True
    user.save()
    client = api_client
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def instructor_client(api_client, create_user):
    """Return an API client with an authenticated instructor user."""
    from apps.users.models import User

    user = create_user()
    user.role = User.Role.INSTRUCTOR
    user.save()
    client = api_client
    client.force_authenticate(user=user)
    return client


# =========================================================================
# Domain fixtures used by edge-case test suites
# =========================================================================


@pytest.fixture
def user(db):
    """Return a standard user instance."""
    from apps.users.models import User
    return User.objects.create_user(
        email="fixtureuser@example.com",
        username="fixtureuser",
        password="TestPass123!",
    )


@pytest.fixture
def instructor(db):
    """Return a user with INSTRUCTOR role."""
    from apps.users.models import User
    instr = User.objects.create_user(
        email="instructor@example.com",
        username="instructor",
        password="TestPass123!",
    )
    instr.role = User.Role.INSTRUCTOR
    instr.save()
    return instr


@pytest.fixture
def course(db, instructor):
    """Return a published, free course with an instructor."""
    from apps.courses.models import Course, Category
    category, _ = Category.objects.get_or_create(name="Programming", slug="programming")
    return Course.objects.create(
        title="Test Course",
        slug="test-course",
        description="A test course for edge-case testing.",
        short_description="Test course",
        instructor=instructor,
        category=category,
        is_published=True,
        is_free=True,
        price=0,
    )


@pytest.fixture
def badge(db):
    """Return a Badge instance for gamification tests."""
    from apps.gamification.models import Badge
    return Badge.objects.create(
        name="First Steps",
        description="Complete your first course",
        icon="\U0001f3c5",
        criteria_type="courses_completed",
        criteria_value=1,
        xp_reward=50,
    )


@pytest.fixture
def category(db):
    """Return a Category instance."""
    from apps.courses.models import Category
    cat, _ = Category.objects.get_or_create(name="Programming", slug="programming")
    return cat


@pytest.fixture
def user_factory(db):
    """Factory fixture to create users with unique defaults."""
    from apps.users.models import User
    _counter = [0]

    def _create(**kwargs):
        _counter[0] += 1
        defaults = {
            "email": f"factory{_counter[0]}@example.com",
            "username": f"factoryuser{_counter[0]}",
            "password": "TestPass123!",
        }
        defaults.update(kwargs)
        password = defaults.pop("password")
        return User.objects.create_user(password=password, **defaults)

    return _create


@pytest.fixture
def create_course(db, instructor):
    """Factory fixture to create courses."""
    from apps.courses.models import Course, Category
    _counter = [0]

    def _create(**kwargs):
        _counter[0] += 1
        cat, _ = Category.objects.get_or_create(
            slug="programming", defaults={"name": "Programming"}
        )
        defaults = {
            "title": f"Test Course {_counter[0]}",
            "slug": f"test-course-{_counter[0]}",
            "description": "A test course.",
            "short_description": "Test course",
            "instructor": instructor,
            "category": cat,
            "is_published": True,
            "is_free": True,
            "price": 0,
        }
        defaults.update(kwargs)
        return Course.objects.create(**defaults)

    return _create


@pytest.fixture
def enrollment(db, user, course):
    """Return an Enrollment linking user and course."""
    from apps.courses.models import Enrollment
    return Enrollment.objects.create(user=user, course=course)

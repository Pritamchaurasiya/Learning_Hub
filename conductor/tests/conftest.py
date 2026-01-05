"""
Pytest fixtures for Learning Hub Backend tests.
"""

import pytest
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def create_user(db):
    """Factory fixture to create users."""

    def _create_user(
        email="test@example.com", username="testuser", password="TestPass123!", **kwargs
    ):
        return User.objects.create_user(
            email=email, username=username, password=password, **kwargs
        )

    return _create_user


@pytest.fixture
def user(create_user):
    """Create a default test user."""
    return create_user()


@pytest.fixture
def instructor(create_user):
    """Create an instructor user."""
    return create_user(
        email="instructor@example.com", username="instructor", role=User.Role.INSTRUCTOR
    )


@pytest.fixture
def admin_user(create_user):
    """Create an admin user."""
    return create_user(
        email="admin@example.com", username="admin", role=User.Role.ADMIN, is_staff=True
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def instructor_client(api_client, instructor):
    """Return an API client authenticated as instructor."""
    api_client.force_authenticate(user=instructor)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an API client authenticated as admin."""
    api_client.force_authenticate(user=admin_user)
    return api_client

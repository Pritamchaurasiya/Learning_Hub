"""
Pytest fixtures for Learning Hub Backend tests.
"""

import pytest

from apps.users.models import User


@pytest.fixture
def api_client():
    """Return an unauthenticated API client."""
    from rest_framework.test import APIClient
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
def authenticated_client(api_client, create_user):
    """Return an API client with an authenticated user."""
    user = create_user()
    client = api_client
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_client(api_client, create_user):
    """Return an API client with an authenticated admin user."""
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
    user = create_user()
    user.role = User.Role.INSTRUCTOR
    user.save()
    client = api_client
    client.force_authenticate(user=user)
    return client

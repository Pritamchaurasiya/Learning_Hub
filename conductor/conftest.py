import pytest
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_factory(db):
    def create_user(**kwargs):
        return User.objects.create_user(**kwargs)

    return create_user


@pytest.fixture
def auth_client(api_client, user_factory):
    def _auth_client(user=None):
        if user is None:
            user = user_factory(email="test@example.com", password="password")
        api_client.force_authenticate(user=user)
        return api_client, user

    return _auth_client

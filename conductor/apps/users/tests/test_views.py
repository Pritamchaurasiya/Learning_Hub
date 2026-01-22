import pytest
from django.urls import reverse
from rest_framework import status
from apps.users.models import User
from django.core.cache import cache

@pytest.mark.django_db
class TestAuthViews:

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()

    def test_register_user(self, api_client):
        url = reverse("auth:register")
        data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "password": "StrongPassword123!@#",
            "password_confirm": "StrongPassword123!@#",
            "display_name": "New User"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert "accessToken" in response.data["data"]
        assert User.objects.count() == 1

    def test_login_user(self, api_client, user_factory):
        password = "StrongPassword123!@#"
        user = user_factory(email="login@test.com", password=password)
        
        url = reverse("auth:login")
        data = {"email": "login@test.com", "password": password}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert "accessToken" in response.data["data"]

    def test_login_invalid_password(self, api_client, user_factory):
        user_factory(email="login@test.com", password="correct_password")
        url = reverse("auth:login")
        data = {"email": "login@test.com", "password": "wrong_password"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password(self, auth_client):
        client, user = auth_client() # Creates auto-user with password="password"
        url = reverse("auth:change_password")
        data = {
            "current_password": "password",
            "new_password": "NewPassword123!",
            "new_password_confirm": "NewPassword123!"
        }
        response = client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        
        # Verify new password works
        user.refresh_from_db()
        assert user.check_password("NewPassword123!")

@pytest.mark.django_db
class TestUserViews:
    
    def test_get_profile(self, auth_client):
        client, user = auth_client()
        url = reverse("users:profile")
        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["email"] == user.email

    def test_update_profile(self, auth_client):
        client, user = auth_client()
        url = reverse("users:profile")
        data = {"display_name": "Updated Name", "bio": "Updated Bio"}
        response = client.put(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["display_name"] == "Updated Name"
        
        user.refresh_from_db()
        assert user.display_name == "Updated Name"

    def test_get_profile_unauthenticated(self, api_client):
        url = reverse("users:profile")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

"""
User model and API tests.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()


# ============== Model Tests ==============


@pytest.mark.django_db
class TestUserModel:
    """Tests for User model."""

    def test_create_user(self, create_user):
        """Test creating a user with email and password."""
        user = create_user(email="new@test.com", username="newuser")
        assert user.email == "new@test.com"
        assert user.username == "newuser"
        assert user.role == User.Role.STUDENT
        assert user.is_active is True
        assert user.is_staff is False
        assert user.check_password("TestPass123!")

    def test_create_superuser(self, db):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            email="super@test.com", username="superadmin", password="SuperPass123!"
        )
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.role == User.Role.ADMIN
        assert user.is_verified is True

    def test_user_str(self, user):
        """Test user string representation."""
        assert str(user) == user.email

    def test_user_full_name(self, user):
        """Test get_full_name method."""
        # Without display_name, returns email
        assert user.get_full_name() == user.email

        # With display_name
        user.display_name = "Test User"
        user.save()
        assert user.get_full_name() == "Test User"

    def test_is_instructor_property(self, instructor):
        """Test is_instructor property."""
        assert instructor.is_instructor is True
        assert instructor.is_admin is False

    def test_email_normalized(self, create_user):
        """Test email is normalized to lowercase."""
        user = create_user(email="Test@EXAMPLE.COM", username="testcase")
        assert user.email == "test@example.com"


# ============== API Tests ==============


@pytest.mark.django_db
class TestUserRegistration:
    """Tests for user registration endpoint."""

    def test_register_success(self, api_client):
        """Test successful user registration."""
        data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "display_name": "New User",
        }
        response = api_client.post("/api/v1/auth/register/", data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "success"
        assert "accessToken" in response.data["data"]
        assert "refreshToken" in response.data["data"]
        assert response.data["data"]["user"]["email"] == "newuser@test.com"

    def test_register_password_mismatch(self, api_client):
        """Test registration fails with mismatched passwords."""
        data = {
            "email": "test@test.com",
            "username": "testuser",
            "password": "SecurePass123!",
            "password_confirm": "DifferentPass123!",
        }
        response = api_client.post("/api/v1/auth/register/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_email(self, api_client, user):
        """Test registration fails with existing email."""
        data = {
            "email": user.email,
            "username": "different",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
        }
        response = api_client.post("/api/v1/auth/register/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_weak_password(self, api_client):
        """Test registration fails with weak password."""
        data = {
            "email": "test@test.com",
            "username": "testuser",
            "password": "123",
            "password_confirm": "123",
        }
        response = api_client.post("/api/v1/auth/register/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogin:
    """Tests for user login endpoint."""

    def test_login_success(self, api_client, user):
        """Test successful login."""
        data = {"email": user.email, "password": "TestPass123!"}
        response = api_client.post("/api/v1/auth/login/", data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert "accessToken" in response.data["data"]
        assert "refreshToken" in response.data["data"]

    def test_login_wrong_password(self, api_client, user):
        """Test login fails with wrong password."""
        data = {"email": user.email, "password": "WrongPassword!"}
        response = api_client.post("/api/v1/auth/login/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_nonexistent_user(self, api_client):
        """Test login fails with non-existent email."""
        data = {"email": "nonexistent@test.com", "password": "SomePass123!"}
        response = api_client.post("/api/v1/auth/login/", data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserProfile:
    """Tests for user profile endpoints."""

    def test_get_profile_authenticated(self, api_client, user):
        """Test getting profile when authenticated."""
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/v1/users/profile/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["email"] == user.email

    def test_get_profile_unauthenticated(self, api_client):
        """Test getting profile fails when not authenticated."""
        response = api_client.get("/api/v1/users/profile/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile(self, authenticated_client, user):
        """Test updating profile."""
        data = {"display_name": "Updated Name", "bio": "My new bio"}
        response = authenticated_client.put("/api/v1/users/profile/", data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["display_name"] == "Updated Name"
        assert response.data["data"]["bio"] == "My new bio"

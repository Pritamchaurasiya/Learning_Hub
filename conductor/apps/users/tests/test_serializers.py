import pytest
from rest_framework.exceptions import ValidationError
from apps.users.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer,
)
from apps.users.models import User

@pytest.mark.django_db
class TestUserSerializers:

    def test_registration_serializer_success(self):
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "strongPassword123!",
            "password_confirm": "strongPassword123!",
            "display_name": "Test User",
        }
        serializer = UserRegistrationSerializer(data=data)
        assert serializer.is_valid()
        user = serializer.save()
        assert user.email == "test@example.com"
        assert user.check_password("strongPassword123!")

    def test_registration_password_mismatch(self):
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "StrongPassword123!@#",
            "password_confirm": "DifferentPassword123!@#",
        }
        serializer = UserRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert "password_confirm" in serializer.errors

    def test_login_serializer_success(self, user_factory):
        password = "password123"
        user = user_factory(email="login@test.com", password=password)
        data = {"email": "login@test.com", "password": password}
        serializer = UserLoginSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data["user"] == user
        assert "access_token" in serializer.validated_data["tokens"]

    def test_login_invalid_credentials(self, user_factory):
        user_factory(email="login@test.com", password="password123")
        data = {"email": "login@test.com", "password": "wrongpassword"}
        serializer = UserLoginSerializer(data=data)
        with pytest.raises(ValidationError) as exc:
            serializer.is_valid(raise_exception=True)
        assert "Invalid email or password" in str(exc.value)

    def test_profile_update_serializer(self):
        data = {"display_name": "New Name", "bio": "New Bio"}
        serializer = UserProfileUpdateSerializer(data=data)
        assert serializer.is_valid()
        
    def test_change_password_serializer(self, user_factory):
        user = user_factory(email="user@test.com", password="old_password")
        
        # Mock request context
        from collections import namedtuple
        Request = namedtuple("Request", ["user"])
        request = Request(user=user)
        
        data = {
            "current_password": "old_password",
            "new_password": "new_password123",
            "new_password_confirm": "new_password123",
        }
        serializer = ChangePasswordSerializer(data=data, context={"request": request})
        assert serializer.is_valid()


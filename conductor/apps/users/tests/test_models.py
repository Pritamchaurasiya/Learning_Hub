import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpassword"
        )
        assert user.email == "test@example.com"
        assert user.check_password("testpassword")
        assert user.is_active
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            email="admin@example.com", username="admin", password="adminpassword"
        )
        assert admin.is_staff
        assert admin.is_superuser
        assert admin.is_verified

    def test_user_str(self):
        user = User.objects.create_user(
            email="test@example.com", username="testuser", password="testpassword"
        )
        assert str(user) == "test@example.com"

    def test_get_full_name(self):
        user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpassword",
            display_name="Test User",
        )
        assert user.get_full_name() == "Test User"

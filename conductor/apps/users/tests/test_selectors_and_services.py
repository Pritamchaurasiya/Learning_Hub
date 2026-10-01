import pytest
from django.contrib.auth import get_user_model
from apps.users.selectors import (
    get_user_by_id,
    get_user_by_email,
    get_user_by_username,
    list_users,
    list_active_sessions,
)
from apps.users.validators import (
    validate_password_strength,
    validate_phone_number,
)
from rest_framework.exceptions import ValidationError

User = get_user_model()


@pytest.fixture
def sample_user(db):
    return User.objects.create_user(
        email="architect@example.com",
        username="architect",
        password="SecurePassword123!",
        role="admin",
        is_active=True,
    )


@pytest.mark.django_db
def test_user_selectors(sample_user):
    # Retrieve by ID
    user_by_id = get_user_by_id(str(sample_user.id))
    assert user_by_id is not None
    assert user_by_id.email == "architect@example.com"

    # Retrieve by email (case-insensitive)
    user_by_email = get_user_by_email("ARCHITECT@EXAMPLE.COM")
    assert user_by_email is not None
    assert user_by_email.id == sample_user.id

    # Retrieve by username
    user_by_uname = get_user_by_username("architect")
    assert user_by_uname is not None
    assert user_by_uname.id == sample_user.id

    # List users filter
    admin_users = list_users(role="admin")
    assert admin_users.count() >= 1


def test_password_strength_validator():
    # Valid strong password
    validate_password_strength("StrongPass123!")

    # Too short
    with pytest.raises(ValidationError):
        validate_password_strength("Short1!")

    # Missing special character
    with pytest.raises(ValidationError):
        validate_password_strength("NoSpecialChar123")

    # Missing digit
    with pytest.raises(ValidationError):
        validate_password_strength("NoDigitHere!")


def test_phone_validator():
    # Valid E.164
    validate_phone_number("+14155552671")

    # Invalid
    with pytest.raises(ValidationError):
        validate_phone_number("not-a-phone-number")

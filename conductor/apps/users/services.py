import secrets
from datetime import timedelta
from typing import Dict, Any

from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetToken

User = get_user_model()


class UserService:
    """
    Service layer for User related operations.

    Encapsulates business logic for registration, authentication,
    and profile management.
    """

    @staticmethod
    def register_user(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register a new user and generate tokens.
        """
        # User creation is handled by the serializer in the view for now,
        # but we could move it here if it becomes complex.
        # For now, we assume user is already created/validated by serializer
        # or we pass validated data.
        # But looking at the view, it saves the serializer.

        # We will adjust the pattern: Controller (View) -> Service -> Model
        # But to avoid breaking the serializer's save method which might do hashing,
        # we can keep creation there OR call serializer.save() in view.

        # Let's focus on the token generation part which is business logic.
        raise NotImplementedError(
            "Registration refactored to specific serializer/view logic."
        )

    @staticmethod
    def generate_tokens(user) -> Dict[str, str]:
        """
        Generate access and refresh tokens for a user.
        """
        refresh = RefreshToken.for_user(user)
        return {
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
        }

    @staticmethod
    def request_password_reset(email: str) -> bool:
        """
        Initiate password reset process.
        Returns True if email exists and token sent, False otherwise.
        """
        try:
            user = User.objects.get(email=email, is_active=True)

            # Generate reset token
            token = secrets.token_urlsafe(32)
            PasswordResetToken.objects.create(
                user=user, token=token, expires_at=timezone.now() + timedelta(hours=24)
            )

            # TODO: Integrate Email Service here
            # EmailService.send_password_reset(user, token)

            return True

        except User.DoesNotExist:
            return False

    @staticmethod
    def confirm_password_reset(token: str, new_password: str) -> bool:
        """
        Confirm password reset.
        Returns True if successful, raises Exception or returns False if invalid.
        """
        try:
            reset_token = PasswordResetToken.objects.get(token=token)

            if not reset_token.is_valid():
                return False

            user = reset_token.user
            user.set_password(new_password)
            user.save()

            reset_token.is_used = True
            reset_token.save()
            return True

        except PasswordResetToken.DoesNotExist:
            return False

    @staticmethod
    def update_avatar(user, avatar_file) -> str:
        """
        Update user avatar.
        Returns the new avatar URL.
        """
        user.avatar = avatar_file
        user.save()
        return user.avatar.url if user.avatar else ""

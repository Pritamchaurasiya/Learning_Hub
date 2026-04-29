import secrets
from datetime import timedelta
from typing import Dict, Any

from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
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
        Can be used from management commands, tests, and other services.
        """
        user = User.objects.create_user(
            username=user_data["username"],
            email=user_data["email"],
            password=user_data["password"],
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
        )

        tokens = UserService.generate_tokens(user)

        # Publish registration event
        try:
            from apps.core.event_bus import EventBus
            EventBus.publish("user.registered", {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
            })
        except Exception:
            pass

        return {
            "user": user,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        }

    @staticmethod
    def generate_tokens(user: Any) -> Dict[str, str]:
        """
        Generate access and refresh tokens for a user.
        """
        refresh = RefreshToken.for_user(user)
        return {
            "access_token": str(refresh.access_token),  # type: ignore
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

            # Send email asynchronously
            from tasks.tasks import send_password_reset_email
            send_password_reset_email.delay(user.id, token)

            return True

        except User.DoesNotExist:
            return False

    @staticmethod
    def confirm_password_reset(token: str, new_password: str) -> bool:
        """
        Confirm password reset.
        Atomic + delete-after-use to prevent replay attacks.
        Returns True if successful, raises Exception or returns False if invalid.
        """
        try:
            with transaction.atomic():
                reset_token = PasswordResetToken.objects.select_for_update().get(token=token)

                if not reset_token.is_valid():
                    return False

                user = reset_token.user
                user.set_password(new_password)
                user.save()

                # Delete the token entirely instead of just marking used
                reset_token.delete()
            return True

        except PasswordResetToken.DoesNotExist:
            return False

    ALLOWED_AVATAR_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
    MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB

    @staticmethod
    def update_avatar(user, avatar_file) -> str:
        """
        Update user avatar with file-type and size validation.
        Returns the new avatar URL.
        """
        # Validate file type
        content_type = getattr(avatar_file, 'content_type', '')
        if content_type not in UserService.ALLOWED_AVATAR_TYPES:
            raise ValidationError(
                f"Invalid file type '{content_type}'. Allowed: JPEG, PNG, WebP."
            )

        # Validate file size
        if avatar_file.size > UserService.MAX_AVATAR_SIZE:
            raise ValidationError(
                f"File too large ({avatar_file.size / (1024*1024):.1f}MB). Max: 5MB."
            )

        user.avatar = avatar_file
        user.save(update_fields=['avatar'])
        return user.avatar.url if user.avatar else ""

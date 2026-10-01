"""
Domain validation rules for the Users app.
"""

import re
from rest_framework.exceptions import ValidationError


def validate_password_strength(password: str) -> None:
    """
    Validate that password meets enterprise security criteria:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special symbol
    """
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise ValidationError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        raise ValidationError("Password must contain at least one numeric digit.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValidationError("Password must contain at least one special character (!@#$%^&*).")


ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


def validate_avatar_file(avatar_file) -> None:
    """
    Validate uploaded avatar file size and MIME content type.
    """
    content_type = getattr(avatar_file, "content_type", "")
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise ValidationError(
            f"Invalid avatar image format '{content_type}'. Allowed formats: JPEG, PNG, WebP, GIF."
        )
    if avatar_file.size > MAX_AVATAR_SIZE:
        raise ValidationError(
            f"Avatar file exceeds the maximum 5MB size limit ({avatar_file.size / (1024 * 1024):.1f}MB uploaded)."
        )


def validate_phone_number(phone: str) -> None:
    """Validate E.164 international phone number format."""
    if phone and not re.match(r"^\+?[1-9]\d{1,14}$", phone.strip()):
        raise ValidationError("Invalid phone number. Must follow international E.164 format (e.g. +1234567890).")

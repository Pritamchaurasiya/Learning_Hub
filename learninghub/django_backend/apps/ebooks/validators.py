from rest_framework.exceptions import ValidationError
import re


def validate_hex_color(value: str):
    """Validates 3 or 6 hex digits color string, with optional leading #."""
    if not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", value):
        raise ValidationError("Invalid hex color format. Expected format: #RRGGBB or #RGB.")


def validate_highlight_text(value: str):
    """Ensure highlight text is not empty and within reasonable length."""
    stripped = value.strip()
    if not stripped:
        raise ValidationError("Highlight text cannot be empty.")
    if len(stripped) > 5000:
        raise ValidationError("Highlight text exceeds maximum allowable length (5000 chars).")


def validate_progress_percentage(value: float):
    """Ensure reading progress is between 0.0 and 100.0."""
    if value < 0.0 or value > 100.0:
        raise ValidationError("Progress percentage must be between 0.0 and 100.0.")

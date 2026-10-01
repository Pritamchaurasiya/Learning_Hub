"""
Course Validators for Learning Hub Backend.
Domain-level validation logic for course catalog, lessons, enrollments, reviews, and notes.
"""

from decimal import Decimal
from typing import List, Dict, Any
from rest_framework.exceptions import ValidationError


def validate_course_pricing(price: Decimal, is_free: bool) -> None:
    """Validate course price against free status."""
    if is_free:
        if price and price > Decimal("0.00"):
            raise ValidationError("Free courses must have a price of 0.00.")
    else:
        if not price or price <= Decimal("0.00"):
            raise ValidationError("Paid courses must specify a price greater than 0.00.")


def validate_review_rating(rating: int) -> None:
    """Ensure rating is strictly an integer between 1 and 5."""
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        raise ValidationError("Rating must be an integer between 1 and 5.")


def validate_lesson_progress(progress_seconds: float) -> None:
    """Validate lesson playback progress in seconds."""
    if progress_seconds < 0:
        raise ValidationError("Progress seconds cannot be negative.")


def validate_course_requirements(requirements: Any) -> None:
    """Validate course prerequisite requirements list."""
    if not isinstance(requirements, list):
        raise ValidationError("Course requirements must be a list of strings.")
    if len(requirements) > 50:
        raise ValidationError("Course cannot have more than 50 requirements.")
    for item in requirements:
        if not isinstance(item, str) or len(item.strip()) == 0:
            raise ValidationError("Requirement entries must be non-empty strings.")


def validate_learning_objectives(objectives: Any) -> None:
    """Validate course learning objectives list."""
    if not isinstance(objectives, list):
        raise ValidationError("Learning objectives must be a list of strings.")
    if len(objectives) > 50:
        raise ValidationError("Course cannot have more than 50 learning objectives.")
    for item in objectives:
        if not isinstance(item, str) or len(item.strip()) == 0:
            raise ValidationError("Learning objective entries must be non-empty strings.")


def validate_note_content(content: str) -> str:
    """Validate student note content."""
    if not content or not content.strip():
        raise ValidationError("Note content cannot be empty.")
    if len(content) > 5000:
        raise ValidationError("Note content cannot exceed 5000 characters.")
    return content.strip()

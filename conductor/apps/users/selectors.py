"""
Pure read selectors for Users app.
Contains all query logic, prefetching, and caching for the users domain.
"""

from typing import Optional
from django.db.models import QuerySet
from django.contrib.auth import get_user_model
from .models import UserSession, Bookmark, TwoFactorAuth, APIKey

User = get_user_model()


def get_user_by_id(user_id: str) -> Optional[User]:
    """Retrieve a user by their UUID primary key."""
    return User.objects.filter(id=user_id).first()


def get_user_by_email(email: str) -> Optional[User]:
    """Retrieve a user by normalized lowercase email address."""
    return User.objects.filter(email=email.lower().strip()).first()


def get_user_by_username(username: str) -> Optional[User]:
    """Retrieve a user by username."""
    return User.objects.filter(username=username.strip()).first()


def list_users(role: Optional[str] = None, is_active: Optional[bool] = None) -> QuerySet[User]:
    """List users with optional role and status filters."""
    qs = User.objects.all()
    if role:
        qs = qs.filter(role=role)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    return qs.order_by("-created_at")


def list_active_sessions(user) -> QuerySet[UserSession]:
    """List all active login sessions for a user."""
    return UserSession.objects.filter(user=user, is_active=True).order_by("-last_active")


def get_user_bookmarks(user) -> QuerySet[Bookmark]:
    """List all course bookmarks for a user with pre-fetched course details."""
    return Bookmark.objects.filter(user=user).select_related("course")


def get_user_2fa_status(user) -> Optional[TwoFactorAuth]:
    """Get the 2FA configuration record for a user."""
    return TwoFactorAuth.objects.filter(user=user).first()


def list_user_api_keys(user) -> QuerySet[APIKey]:
    """List all active API keys for a user."""
    return APIKey.objects.filter(user=user, is_active=True).order_by("-created_at")

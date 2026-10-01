"""
API Key Management Service for Developers and External Integrations.
"""

import hashlib
import secrets
from datetime import timedelta
from django.utils import timezone
from .models import APIKey, User


class APIKeyService:
    """Service to create, validate, list, and revoke developer API keys."""

    PREFIX_LENGTH = 8
    SECRET_LENGTH = 32

    @classmethod
    def create_api_key(cls, user: User, name: str, scopes: list = None, expires_in_days: int = None) -> dict:
        """
        Generate and store a new API Key.
        Returns the plaintext key (displayed only once) and key metadata.
        """
        prefix = secrets.token_hex(cls.PREFIX_LENGTH // 2)
        raw_secret = secrets.token_urlsafe(cls.SECRET_LENGTH)
        full_key = f"lhub_{prefix}_{raw_secret}"

        hashed_key = hashlib.sha256(full_key.encode('utf-8')).hexdigest()

        expires_at = None
        if expires_in_days and expires_in_days > 0:
            expires_at = timezone.now() + timedelta(days=expires_in_days)

        api_key = APIKey.objects.create(
            user=user,
            name=name,
            prefix=prefix,
            hashed_key=hashed_key,
            scopes=scopes or ["read", "write"],
            expires_at=expires_at,
            is_active=True,
        )

        return {
            "id": str(api_key.id),
            "name": api_key.name,
            "key": full_key,  # Returned only upon creation
            "prefix": prefix,
            "scopes": api_key.scopes,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "created_at": api_key.created_at.isoformat(),
        }

    @classmethod
    def list_api_keys(cls, user: User) -> list:
        """List active and revoked API keys (masked) for a user."""
        keys = APIKey.objects.filter(user=user).order_by('-created_at')
        return [
            {
                "id": str(k.id),
                "name": k.name,
                "prefix": f"lhub_{k.prefix}_****",
                "scopes": k.scopes,
                "is_active": k.is_active,
                "is_expired": k.expires_at < timezone.now() if k.expires_at else False,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "created_at": k.created_at.isoformat(),
            }
            for k in keys
        ]

    @classmethod
    def revoke_api_key(cls, user: User, key_id: str) -> bool:
        """Revoke an API key."""
        api_key = APIKey.objects.filter(user=user, id=key_id).first()
        if api_key:
            api_key.is_active = False
            api_key.save(update_fields=['is_active'])
            return True
        return False

    @classmethod
    def validate_api_key(cls, raw_key: str) -> User:
        """Validate raw API key string and return associated User if valid."""
        if not raw_key or not raw_key.startswith("lhub_"):
            return None

        parts = raw_key.split("_")
        if len(parts) < 3:
            return None

        prefix = parts[1]
        hashed_input = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

        api_key = APIKey.objects.select_related('user').filter(
            prefix=prefix,
            hashed_key=hashed_input,
            is_active=True,
        ).first()

        if not api_key:
            return None

        if api_key.expires_at and api_key.expires_at < timezone.now():
            return None

        if not api_key.user.is_active:
            return None

        # Update last used timestamp
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])

        return api_key.user

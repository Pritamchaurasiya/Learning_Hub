"""
Two-Factor Authentication (TOTP) Service for Learning Hub.
Implements RFC 6238 time-based one-time passwords without third-party external dependencies.
"""

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
import urllib.parse
from django.utils import timezone
from .models import TwoFactorAuth, User


class TwoFactorService:
    """Service to generate TOTP secrets, verification codes, QR data, and recovery codes."""

    @staticmethod
    def _generate_secret() -> str:
        """Generate base32-compatible secret string."""
        random_bytes = os.urandom(20)
        return base64.b32encode(random_bytes).decode('utf-8').rstrip('=')

    @staticmethod
    def _get_totp_code(secret: str, time_step: int = 30, t: int = None) -> str:
        """Calculate TOTP code for a given timestamp."""
        if t is None:
            t = int(time.time())
        counter = t // time_step
        
        # Pad secret if needed
        padding = (8 - len(secret) % 8) % 8
        padded_secret = secret + '=' * padding
        key = base64.b32decode(padded_secret, casefold=True)
        
        msg = struct.pack(">Q", counter)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[19] & 0x0F
        code_int = struct.unpack(">I", h[offset:offset + 4])[0] & 0x7FFFFFFF
        code = str(code_int % 1000000).zfill(6)
        return code

    @classmethod
    def verify_totp(cls, secret: str, code: str, window: int = 1) -> bool:
        """Verify TOTP code with time drift window tolerance."""
        if not secret or not code or len(str(code).strip()) != 6 or not str(code).strip().isdigit():
            return False

        current_time = int(time.time())
        for step_offset in range(-window, window + 1):
            target_t = current_time + (step_offset * 30)
            expected = cls._get_totp_code(secret, t=target_t)
            if hmac.compare_digest(expected, str(code).strip()):
                return True
        return False

    @classmethod
    def setup_2fa(cls, user: User) -> dict:
        """Initialize or retrieve TOTP secret for setup."""
        two_factor, _ = TwoFactorAuth.objects.get_or_create(user=user)
        if not two_factor.secret or not two_factor.is_enabled:
            two_factor.secret = cls._generate_secret()
            two_factor.save(update_fields=['secret'])

        issuer = "LearningHub"
        account_name = user.email
        encoded_issuer = urllib.parse.quote(issuer)
        encoded_account = urllib.parse.quote(account_name)
        
        otpauth_url = f"otpauth://totp/{encoded_issuer}:{encoded_account}?secret={two_factor.secret}&issuer={encoded_issuer}&algorithm=SHA1&digits=6&period=30"

        return {
            "secret": two_factor.secret,
            "otpauth_url": otpauth_url,
            "is_enabled": two_factor.is_enabled,
            "issuer": issuer,
            "account": account_name,
        }

    @classmethod
    def enable_2fa(cls, user: User, code: str) -> dict:
        """Verify initial TOTP code and enable 2FA, generating recovery codes."""
        two_factor = TwoFactorAuth.objects.filter(user=user).first()
        if not two_factor or not two_factor.secret:
            raise ValueError("2FA has not been initialized. Please run setup first.")

        if not cls.verify_totp(two_factor.secret, code):
            raise ValueError("Invalid verification code. Please check your authenticator app.")

        # Generate 8 backup recovery codes
        recovery_codes = [secrets.token_hex(4).upper() for _ in range(8)]
        two_factor.recovery_codes = recovery_codes
        two_factor.is_enabled = True
        two_factor.last_verified_at = timezone.now()
        two_factor.save(update_fields=['is_enabled', 'recovery_codes', 'last_verified_at'])

        return {
            "is_enabled": True,
            "recovery_codes": recovery_codes,
            "message": "Two-Factor Authentication successfully enabled.",
        }

    @classmethod
    def disable_2fa(cls, user: User, password: str) -> bool:
        """Disable 2FA after password confirmation."""
        if not user.check_password(password):
            raise ValueError("Invalid password.")

        two_factor = TwoFactorAuth.objects.filter(user=user).first()
        if two_factor:
            two_factor.is_enabled = False
            two_factor.secret = ""
            two_factor.recovery_codes = []
            two_factor.save()
        return True

    @classmethod
    def verify_login_2fa(cls, user: User, code_or_recovery: str) -> bool:
        """Verify 2FA code or recovery code during login."""
        two_factor = TwoFactorAuth.objects.filter(user=user, is_enabled=True).first()
        if not two_factor or not two_factor.is_enabled:
            return True  # 2FA not enabled

        code = code_or_recovery.strip()
        # Check standard TOTP
        if len(code) == 6 and code.isdigit():
            if cls.verify_totp(two_factor.secret, code):
                two_factor.last_verified_at = timezone.now()
                two_factor.save(update_fields=['last_verified_at'])
                return True

        # Check recovery codes
        code_upper = code.upper()
        if code_upper in two_factor.recovery_codes:
            two_factor.recovery_codes.remove(code_upper)
            two_factor.last_verified_at = timezone.now()
            two_factor.save(update_fields=['recovery_codes', 'last_verified_at'])
            return True

        return False

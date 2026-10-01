"""
User Active Sessions & Device Security Management Service.
"""

import uuid
from django.utils import timezone
from .models import UserSession, User


class SessionService:
    """Service to track, list, and revoke user devices and sessions."""

    @staticmethod
    def _parse_device_info(user_agent: str) -> str:
        """Extract a readable device / browser label from User-Agent."""
        if not user_agent:
            return "Unknown Device"
        ua = user_agent.lower()
        device = "Desktop"
        if "mobile" in ua or "android" in ua or "iphone" in ua:
            device = "Mobile"
        elif "ipad" in ua or "tablet" in ua:
            device = "Tablet"

        browser = "Browser"
        if "edg" in ua:
            browser = "Edge"
        elif "chrome" in ua:
            browser = "Chrome"
        elif "firefox" in ua:
            browser = "Firefox"
        elif "safari" in ua and "chrome" not in ua:
            browser = "Safari"

        return f"{browser} on {device}"

    @classmethod
    def record_session(cls, user: User, request) -> UserSession:
        """Record or update active user session."""
        session_key = getattr(request, 'session', None)
        if session_key and hasattr(session_key, 'session_key') and session_key.session_key:
            s_key = session_key.session_key
        else:
            # Fallback to authorization header hash or unique client signature
            auth_header = request.headers.get('Authorization', '')
            if auth_header:
                import hashlib
                s_key = hashlib.sha256(auth_header.encode()).hexdigest()[:32]
            else:
                s_key = uuid.uuid4().hex[:32]

        ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        device_info = cls._parse_device_info(user_agent)

        session, _ = UserSession.objects.update_or_create(
            user=user,
            session_key=s_key,
            defaults={
                'ip_address': ip if ip and len(ip) <= 45 else None,
                'user_agent': user_agent[:500],
                'device_info': device_info,
                'is_active': True,
            }
        )
        return session

    @classmethod
    def list_active_sessions(cls, user: User, current_session_key: str = None) -> list:
        """List active sessions for a user with current session indicator."""
        sessions = UserSession.objects.filter(user=user, is_active=True).order_by('-last_active')
        data = []
        for s in sessions:
            data.append({
                "id": str(s.id),
                "device_info": s.device_info,
                "ip_address": s.ip_address or "Unknown",
                "last_active": s.last_active.isoformat(),
                "created_at": s.created_at.isoformat(),
                "is_current": s.session_key == current_session_key if current_session_key else False,
            })
        return data

    @classmethod
    def revoke_session(cls, user: User, session_id: str) -> bool:
        """Revoke a specific session."""
        session = UserSession.objects.filter(user=user, id=session_id).first()
        if session:
            session.is_active = False
            session.save(update_fields=['is_active'])
            return True
        return False

    @classmethod
    def revoke_all_other_sessions(cls, user: User, current_session_key: str = None) -> int:
        """Revoke all sessions except the current one."""
        qs = UserSession.objects.filter(user=user, is_active=True)
        if current_session_key:
            qs = qs.exclude(session_key=current_session_key)
        count = qs.update(is_active=False)
        return count

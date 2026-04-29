"""
Audit Logging System
Tracks security-relevant events for compliance and monitoring
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

# Configure audit logger
audit_logger = logging.getLogger('audit')


class AuditEvent:
    """Represents an auditable event."""
    
    EVENT_TYPES = {
        'USER_LOGIN': 'user.login',
        'USER_LOGOUT': 'user.logout',
        'USER_REGISTERED': 'user.registered',
        'PASSWORD_CHANGED': 'user.password_changed',
        'COURSE_ENROLLED': 'course.enrolled',
        'PAYMENT_COMPLETED': 'payment.completed',
        'ADMIN_ACTION': 'admin.action',
        'DATA_EXPORT': 'data.export',
        'SECURITY_ALERT': 'security.alert',
    }
    
    def __init__(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: str = 'info'
    ):
        self.event_type = event_type
        self.user_id = user_id
        self.ip_address = ip_address
        self.details = details or {}
        self.severity = severity
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> dict:
        """Convert to dictionary for logging."""
        return {
            'timestamp': self.timestamp,
            'event_type': self.event_type,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'details': self.details,
            'severity': self.severity,
        }


class AuditLogger:
    """Centralized audit logging system."""
    
    @classmethod
    def log(cls, event: AuditEvent):
        """Log an audit event."""
        event_data = json.dumps(event.to_dict())
        
        if event.severity == 'error':
            audit_logger.error(event_data)
        elif event.severity == 'warning':
            audit_logger.warning(event_data)
        else:
            audit_logger.info(event_data)
    
    @classmethod
    def log_user_login(cls, user, ip_address: str, success: bool = True):
        """Log user login attempt."""
        event = AuditEvent(
            event_type=AuditEvent.EVENT_TYPES['USER_LOGIN'],
            user_id=user.id if user else None,
            ip_address=ip_address,
            details={'success': success},
            severity='info' if success else 'warning'
        )
        cls.log(event)
    
    @classmethod
    def log_password_change(cls, user_id: int, ip_address: str):
        """Log password change."""
        event = AuditEvent(
            event_type=AuditEvent.EVENT_TYPES['PASSWORD_CHANGED'],
            user_id=user_id,
            ip_address=ip_address,
            severity='info'
        )
        cls.log(event)
    
    @classmethod
    def log_admin_action(cls, admin_id: int, action: str, target: str, ip_address: str):
        """Log administrative action."""
        event = AuditEvent(
            event_type=AuditEvent.EVENT_TYPES['ADMIN_ACTION'],
            user_id=admin_id,
            ip_address=ip_address,
            details={'action': action, 'target': target},
            severity='warning'
        )
        cls.log(event)
    
    @classmethod
    def log_security_alert(cls, alert_type: str, details: dict, ip_address: Optional[str] = None):
        """Log security alert."""
        event = AuditEvent(
            event_type=AuditEvent.EVENT_TYPES['SECURITY_ALERT'],
            ip_address=ip_address,
            details={'alert_type': alert_type, **details},
            severity='error'
        )
        cls.log(event)


class AuditLogMiddleware:
    """Middleware to automatically log security events."""
    
    SENSITIVE_ENDPOINTS = [
        '/api/v1/auth/login/',
        '/api/v1/auth/register/',
        '/api/v1/auth/change-password/',
        '/admin/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log sensitive endpoint access
        if any(request.path.startswith(endpoint) for endpoint in self.SENSITIVE_ENDPOINTS):
            self._log_request(request, response)
        
        # Log failed login attempts
        if request.path.startswith('/api/v1/auth/login/') and response.status_code != 200:
            ip = self._get_client_ip(request)
            AuditLogger.log_security_alert(
                alert_type='failed_login',
                details={'path': request.path, 'status': response.status_code},
                ip_address=ip
            )
        
        return response
    
    def _log_request(self, request, response):
        """Log request details."""
        pass  # Implementation would log to database or external system
    
    def _get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')

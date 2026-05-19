"""
Comprehensive Audit Logging System

Enterprise-grade audit logging for security, compliance, and analytics.

Features:
1. User action tracking
2. API request logging
3. Data change audit trail
4. Security event monitoring
5. Performance metrics
6. Compliance reporting
"""

import logging
import json
import traceback
from datetime import timedelta
from typing import Dict, Any, List, Optional
from enum import Enum
from functools import wraps

from django.utils import timezone
from django.db import models
from django.conf import settings
from django.core.cache import cache
from django.contrib.contenttypes.models import ContentType

from apps.core.models import BaseModel

logger = logging.getLogger(__name__)


class AuditAction(Enum):
    """Types of auditable actions."""
    # Authentication & Profile
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    PROFILE_CREATED = "profile_created"
    
    # Data operations
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"
    IMPORT = "import"
    
    # Course operations
    COURSE_ENROLL = "course_enroll"
    COURSE_COMPLETE = "course_complete"
    LESSON_START = "lesson_start"
    LESSON_COMPLETE = "lesson_complete"
    QUIZ_SUBMIT = "quiz_submit"
    
    # Payment operations
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_PROCESSED = "payment_processed"
    REFUND_REQUESTED = "refund_requested"
    REFUND_PROCESSED = "refund_processed"
    
    # Admin operations
    USER_SUSPENDED = "user_suspended"
    USER_ACTIVATED = "user_activated"
    ROLE_ASSIGNED = "role_assigned"
    PERMISSION_GRANTED = "permission_granted"
    CONTENT_MODERATED = "content_moderated"
    
    # Security events
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH_ATTEMPT = "data_breach_attempt"


class AuditSeverity(Enum):
    """Severity levels for audit events."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class EnterpriseAuditLog(BaseModel):
    """
    Enterprise-grade audit log entry model.
    
    More comprehensive than core.models.AuditLog, used for 
    detailed security auditing and compliance reporting.
    """
    # Actor information
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    username = models.CharField(max_length=150, blank=True)
    user_email = models.EmailField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Action information
    action = models.CharField(max_length=50, db_index=True)
    severity = models.CharField(max_length=20, default='info')
    
    # Resource information
    resource_type = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    resource_name = models.CharField(max_length=255, blank=True)
    
    # Request information
    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    request_params = models.JSONField(default=dict, blank=True)
    
    # Change details
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    
    # Response information
    response_status = models.IntegerField(null=True, blank=True)
    execution_time_ms = models.FloatField(null=True, blank=True)
    
    # Additional context
    metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    stack_trace = models.TextField(blank=True)
    
    class Meta:
        app_label = 'core'
        db_table = 'enterprise_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['severity', 'created_at']),
        ]
    
    def __str__(self):
        return f"[{self.severity}] {self.action} by {self.username or 'system'}"


class AuditService:
    """
    Service for creating and querying audit logs.
    """
    
    @classmethod
    def log(
        cls,
        action: AuditAction,
        user=None,
        request=None,
        resource_type: str = "",
        resource_id: str = "",
        resource_name: str = "",
        old_values: Dict = None,
        new_values: Dict = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        metadata: Dict = None,
        error_message: str = "",
        execution_time_ms: float = None
    ) -> 'EnterpriseAuditLog':
        """
        Create an audit log entry.
        """
        # Extract request info
        ip_address = None
        user_agent = ""
        request_method = ""
        request_path = ""
        request_params = {}
        
        if request:
            ip_address = cls._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
            request_method = request.method
            request_path = request.path[:500]
            
            # Sanitize request params (remove sensitive data)
            params = dict(request.GET)
            params.update(dict(request.POST))
            request_params = cls._sanitize_params(params)
        
        # Extract user info
        user_id = None
        username = ""
        user_email = ""
        
        if user and hasattr(user, 'id'):
            user_id = user.id
            username = getattr(user, 'username', '')
            user_email = getattr(user, 'email', '')
        
        # Create log entry
        log_entry = EnterpriseAuditLog.objects.create(
            user_id=user_id,
            username=username,
            user_email=user_email,
            ip_address=ip_address,
            user_agent=user_agent,
            action=action.value,
            severity=severity.value,
            resource_type=resource_type,
            resource_id=str(resource_id),
            resource_name=resource_name,
            request_method=request_method,
            request_path=request_path,
            request_params=request_params,
            old_values=old_values or {},
            new_values=new_values or {},
            metadata=metadata or {},
            error_message=error_message,
            execution_time_ms=execution_time_ms
        )
        
        # Log critical events to standard logger as well
        if severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
            logger.error(f"AUDIT: {action.value} - {error_message} - User: {username}")
        
        return log_entry
    
    @classmethod
    def _get_client_ip(cls, request) -> Optional[str]:
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
    
    @classmethod
    def _sanitize_params(cls, params: Dict) -> Dict:
        """Remove sensitive data from request parameters."""
        sensitive_keys = ['password', 'token', 'secret', 'key', 'authorization', 'credit_card']
        
        sanitized = {}
        for key, value in params.items():
            if any(s in key.lower() for s in sensitive_keys):
                sanitized[key] = '[REDACTED]'
            else:
                sanitized[key] = value
        
        return sanitized
    
    # ==========================================================================
    # QUERY METHODS
    # ==========================================================================
    
    @classmethod
    def get_user_activity(
        cls,
        user_id: str,
        days: int = 30,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get activity log for a specific user."""
        since = timezone.now() - timedelta(days=days)
        
        logs = EnterpriseAuditLog.objects.filter(
            user_id=user_id,
            created_at__gte=since
        ).order_by('-created_at')[:limit]
        
        return [
            {
                'action': log.action,
                'severity': log.severity,
                'resource_type': log.resource_type,
                'resource_name': log.resource_name,
                'ip_address': log.ip_address,
                'timestamp': log.created_at.isoformat()
            }
            for log in logs
        ]
    
    @classmethod
    def get_security_events(
        cls,
        hours: int = 24,
        severity_filter: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Get recent security-related events."""
        since = timezone.now() - timedelta(hours=hours)
        
        security_actions = [
            AuditAction.LOGIN_FAILED.value,
            AuditAction.SUSPICIOUS_ACTIVITY.value,
            AuditAction.RATE_LIMIT_EXCEEDED.value,
            AuditAction.UNAUTHORIZED_ACCESS.value,
            AuditAction.DATA_BREACH_ATTEMPT.value,
        ]
        
        query = EnterpriseAuditLog.objects.filter(
            action__in=security_actions,
            created_at__gte=since
        )
        
        if severity_filter:
            query = query.filter(severity__in=severity_filter)
        
        logs = query.order_by('-created_at')[:100]
        
        return [
            {
                'id': str(log.id),
                'action': log.action,
                'severity': log.severity,
                'username': log.username,
                'ip_address': log.ip_address,
                'error_message': log.error_message,
                'timestamp': log.created_at.isoformat()
            }
            for log in logs
        ]
    
    @classmethod
    def get_resource_history(
        cls,
        resource_type: str,
        resource_id: str
    ) -> List[Dict[str, Any]]:
        """Get complete audit history for a resource."""
        logs = EnterpriseAuditLog.objects.filter(
            resource_type=resource_type,
            resource_id=str(resource_id)
        ).order_by('-created_at')[:50]
        
        return [
            {
                'action': log.action,
                'username': log.username,
                'old_values': log.old_values,
                'new_values': log.new_values,
                'timestamp': log.created_at.isoformat()
            }
            for log in logs
        ]
    
    @classmethod
    def get_audit_summary(cls, days: int = 7) -> Dict[str, Any]:
        """Get summary statistics for auditing dashboard."""
        since = timezone.now() - timedelta(days=days)
        
        logs = EnterpriseAuditLog.objects.filter(created_at__gte=since)
        
        # Action breakdown
        action_counts = logs.values('action').annotate(count=models.Count('id'))
        
        # Severity breakdown
        severity_counts = logs.values('severity').annotate(count=models.Count('id'))
        
        # Top users by activity
        top_users = logs.exclude(user_id__isnull=True).values('username').annotate(
            count=models.Count('id')
        ).order_by('-count')[:10]
        
        # Security events count
        security_actions = [
            AuditAction.LOGIN_FAILED.value,
            AuditAction.SUSPICIOUS_ACTIVITY.value,
            AuditAction.UNAUTHORIZED_ACCESS.value,
        ]
        security_events = logs.filter(action__in=security_actions).count()
        
        return {
            'total_events': logs.count(),
            'security_events': security_events,
            'by_action': {item['action']: item['count'] for item in action_counts},
            'by_severity': {item['severity']: item['count'] for item in severity_counts},
            'top_users': list(top_users),
            'period_days': days
        }


# ==========================================================================
# DECORATORS
# ==========================================================================

def audit_action(action: AuditAction, resource_type: str = ""):
    """
    Decorator to automatically audit function calls.
    
    Usage:
        @audit_action(AuditAction.CREATE, "course")
        def create_course(request, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            start_time = timezone.now()
            error_msg = ""
            severity = AuditSeverity.INFO
            
            try:
                result = func(request, *args, **kwargs)
                return result
            except Exception as e:
                error_msg = str(e)
                severity = AuditSeverity.ERROR
                raise
            finally:
                end_time = timezone.now()
                execution_time = (end_time - start_time).total_seconds() * 1000
                
                AuditService.log(
                    action=action,
                    user=getattr(request, 'user', None),
                    request=request,
                    resource_type=resource_type,
                    severity=severity,
                    error_message=error_msg,
                    execution_time_ms=execution_time
                )
        
        return wrapper
    return decorator


# ==========================================================================
# MIDDLEWARE
# ==========================================================================

class AuditMiddleware:
    """
    Middleware to audit all API requests.
    """
    
    # Paths to exclude from logging
    EXCLUDED_PATHS = [
        '/health/',
        '/metrics/',
        '/static/',
        '/media/',
    ]
    
    # Methods to log
    LOGGED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if should log
        should_log = self._should_log(request)
        
        start_time = timezone.now()
        
        response = self.get_response(request)
        
        if should_log:
            end_time = timezone.now()
            execution_time = (end_time - start_time).total_seconds() * 1000
            
            # Determine action based on method
            action = self._get_action_from_method(request.method)
            
            AuditService.log(
                action=action,
                user=getattr(request, 'user', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
                request=request,
                severity=AuditSeverity.INFO,
                execution_time_ms=execution_time,
                metadata={
                    'response_status': response.status_code
                }
            )
        
        return response
    
    def _should_log(self, request) -> bool:
        """Determine if request should be logged."""
        # Exclude certain paths
        for path in self.EXCLUDED_PATHS:
            if request.path.startswith(path):
                return False
        
        # Only log modifying methods by default
        return request.method in self.LOGGED_METHODS
    
    def _get_action_from_method(self, method: str) -> AuditAction:
        """Map HTTP method to audit action."""
        mapping = {
            'POST': AuditAction.CREATE,
            'PUT': AuditAction.UPDATE,
            'PATCH': AuditAction.UPDATE,
            'DELETE': AuditAction.DELETE,
            'GET': AuditAction.READ,
        }
        return mapping.get(method, AuditAction.READ)

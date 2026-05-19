from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import uuid
import json
import ipaddress
import re


class BaseModel(models.Model):
    """Abstract base model with UUID primary key and timestamps."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
    
    def to_dict(self, exclude=None):
        """Convert model to dictionary for JSON serialization."""
        exclude = exclude or []
        data = {}
        for field in self._meta.fields:
            if field.name not in exclude:
                value = getattr(self, field.name)
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    value = str(value)
                data[field.name] = value
        return data


class AuditLog(BaseModel):
    """
    Enterprise Security Audit Log.
    Tracks critical modifying actions.
    
    Security Features:
    - IP address validation and normalization
    - Sensitive data filtering in details
    - Indexed for fast security queries
    """
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50)  # POST, PUT, DELETE, LOGIN_FAILURE
    resource = models.CharField(max_length=255)  # URL or Object Name
    ip_address = models.GenericIPAddressField(null=True)
    details = models.TextField(blank=True)  # JSON payload or description
    
    # Enhanced security fields
    user_agent = models.CharField(max_length=500, blank=True)
    severity = models.CharField(
        max_length=20, 
        default='info',
        choices=[
            ('debug', 'Debug'),
            ('info', 'Info'),
            ('warning', 'Warning'),
            ('error', 'Error'),
            ('critical', 'Critical'),
        ]
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['actor']),
            models.Index(fields=['severity', 'created_at']),
            models.Index(fields=['ip_address']),
        ]

    def __str__(self):
        timestamp = self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else 'Unknown'
        actor_name = self.actor.username if self.actor else 'System'
        return f"[{timestamp}] {actor_name} - {self.action} on {self.resource}"
    
    @classmethod
    def log_action(cls, action, resource, actor=None, ip_address=None, details=None, severity='info', user_agent=''):
        """
        Helper method to create audit log entries with data sanitization.
        
        Args:
            action: The action type (e.g., 'LOGIN_FAILURE', 'DELETE')
            resource: The resource affected
            actor: The user performing the action
            ip_address: Client IP (will be validated)
            details: Additional context (will be sanitized)
            severity: Log severity level
            user_agent: Client user agent string
        """
        # Validate IP address
        validated_ip = cls._validate_ip(ip_address)
        
        # Sanitize details (remove sensitive data)
        sanitized_details = cls._sanitize_details(details)
        
        return cls.objects.create(
            actor=actor,
            action=action,
            resource=resource[:255],  # Truncate to field max
            ip_address=validated_ip,
            details=sanitized_details,
            severity=severity,
            user_agent=user_agent[:500]  # Truncate to field max
        )
    
    @staticmethod
    def _validate_ip(ip):
        """Validate and normalize IP address."""
        if not ip:
            return None
        try:
            # Normalize IP address
            ip_obj = ipaddress.ip_address(ip)
            return str(ip_obj)
        except ValueError:
            return None
    
    @staticmethod
    def _sanitize_details(details):
        """Remove sensitive data from audit details."""
        if not details:
            return ''
        
        if isinstance(details, dict):
            details = json.dumps(details)
        
        # Patterns for sensitive data
        sensitive_patterns = [
            (r'"password"\s*:\s*"[^"]*"', '"password": "[REDACTED]"'),
            (r'"token"\s*:\s*"[^"]*"', '"token": "[REDACTED]"'),
            (r'"secret"\s*:\s*"[^"]*"', '"secret": "[REDACTED]"'),
            (r'"api_key"\s*:\s*"[^"]*"', '"api_key": "[REDACTED]"'),
            (r'"credit_card"\s*:\s*"[^"]*"', '"credit_card": "[REDACTED]"'),
            (r'"cvv"\s*:\s*"[^"]*"', '"cvv": "[REDACTED]"'),
        ]
        
        for pattern, replacement in sensitive_patterns:
            details = re.sub(pattern, replacement, details, flags=re.IGNORECASE)
        
        return details
    
    @classmethod
    def get_security_events(cls, hours=24, severity_filter=None):
        """
        Get recent security-related events.
        
        Args:
            hours: Look back period in hours
            severity_filter: Optional list of severity levels to filter
        """
        since = timezone.now() - timedelta(hours=hours)
        
        query = cls.objects.filter(
            created_at__gte=since,
            action__in=['LOGIN_FAILURE', 'UNAUTHORIZED', 'RATE_LIMIT', 'SUSPICIOUS']
        )
        
        if severity_filter:
            query = query.filter(severity__in=severity_filter)
        
        return query.order_by('-created_at')[:100]

# Import EnterpriseAuditLog so Django registers it for migrations
try:
    from apps.core.audit_service import EnterpriseAuditLog
except ImportError:
    pass

"""
Audit Trail and Security Monitoring for LearningHub.

Tracks sensitive operations, failed login attempts, and provides
GDPR compliance features.
"""
import logging
from datetime import timedelta
from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from apps.core.models import BaseModel
from django.db import models
from apps.users.models import User

logger = logging.getLogger(__name__)


class AuditEntry(BaseModel):
    """
    Comprehensive audit trail for sensitive operations.
    Records who did what, when, and from where.
    """
    class ActionType(models.TextChoices):
        LOGIN_SUCCESS = 'login_success', 'Login Success'
        LOGIN_FAILURE = 'login_failure', 'Login Failure'
        LOGOUT = 'logout', 'Logout'
        PASSWORD_CHANGE = 'password_change', 'Password Change'
        PASSWORD_RESET = 'password_reset', 'Password Reset'
        USER_CREATE = 'user_create', 'User Created'
        USER_UPDATE = 'user_update', 'User Updated'
        USER_DELETE = 'user_delete', 'User Deleted'
        USER_BULK_ACTION = 'user_bulk_action', 'Bulk User Action'
        COURSE_CREATE = 'course_create', 'Course Created'
        COURSE_UPDATE = 'course_update', 'Course Updated'
        COURSE_DELETE = 'course_delete', 'Course Deleted'
        COURSE_PUBLISH = 'course_publish', 'Course Published'
        COURSE_APPROVE = 'course_approve', 'Course Approved'
        ENROLLMENT_CREATE = 'enrollment_create', 'Enrollment Created'
        PAYMENT_INITIATE = 'payment_initiate', 'Payment Initiated'
        PAYMENT_COMPLETE = 'payment_complete', 'Payment Completed'
        PAYMENT_REFUND = 'payment_refund', 'Payment Refunded'
        CERTIFICATE_GENERATE = 'certificate_generate', 'Certificate Generated'
        DATA_EXPORT = 'data_export', 'Data Exported'
        DATA_DELETE = 'data_delete', 'Data Deleted'
        PERMISSION_CHANGE = 'permission_change', 'Permission Changed'
        SETTINGS_CHANGE = 'settings_change', 'Settings Changed'
        SECURITY_ALERT = 'security_alert', 'Security Alert'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_entries'
    )
    action = models.CharField(max_length=30, choices=ActionType.choices)
    
    # Target of the action
    target_type = models.CharField(max_length=50, blank=True, help_text="Model type affected")
    target_id = models.CharField(max_length=100, blank=True, help_text="ID of affected object")
    
    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    endpoint = models.CharField(max_length=255, blank=True)
    
    # Details
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Risk assessment
    is_sensitive = models.BooleanField(default=False, help_text="Requires extra scrutiny")
    risk_level = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')],
        default='low'
    )
    
    class Meta:
        db_table = 'audit_entries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'action', 'created_at']),
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['is_sensitive', 'created_at']),
            models.Index(fields=['risk_level', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.action} by {self.user or 'system'} at {self.created_at}"


class FailedLoginTracker:
    """
    Tracks failed login attempts and implements account lockout.
    Uses cache for fast lookups.
    """
    
    MAX_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=30)
    CACHE_PREFIX = "failed_login:"
    
    @classmethod
    def record_failure(cls, email, ip_address):
        """Record a failed login attempt."""
        # Track by email
        email_key = f"{cls.CACHE_PREFIX}email:{email}"
        email_data = cache.get(email_key, {'attempts': 0, 'first_attempt': None})
        email_data['attempts'] += 1
        if email_data['first_attempt'] is None:
            email_data['first_attempt'] = timezone.now().isoformat()
        cache.set(email_key, email_data, 1800)  # 30 min TTL
        
        # Track by IP
        ip_key = f"{cls.CACHE_PREFIX}ip:{ip_address}"
        ip_data = cache.get(ip_key, {'attempts': 0})
        ip_data['attempts'] += 1
        cache.set(ip_key, ip_data, 1800)
        
        # Log the failure
        logger.warning(
            f"Failed login attempt #{email_data['attempts']} for {email} from IP {ip_address}"
        )
        
        # Create audit entry
        try:
            AuditEntry.objects.create(
                action=AuditEntry.ActionType.LOGIN_FAILURE,
                ip_address=ip_address,
                description=f"Failed login attempt #{email_data['attempts']} for {email}",
                risk_level='medium' if email_data['attempts'] >= 3 else 'low',
                is_sensitive=email_data['attempts'] >= 3,
                metadata={'email': email, 'attempt_count': email_data['attempts']}
            )
        except Exception:
            pass  # Don't fail login flow due to audit issues
        
        return email_data['attempts']
    
    @classmethod
    def is_locked_out(cls, email):
        """Check if an account is locked out due to too many failures."""
        email_key = f"{cls.CACHE_PREFIX}email:{email}"
        data = cache.get(email_key, {'attempts': 0})
        return data['attempts'] >= cls.MAX_ATTEMPTS
    
    @classmethod
    def reset(cls, email):
        """Reset failed login counter after successful login."""
        email_key = f"{cls.CACHE_PREFIX}email:{email}"
        cache.delete(email_key)
    
    @classmethod
    def get_remaining_attempts(cls, email):
        """Get remaining login attempts before lockout."""
        email_key = f"{cls.CACHE_PREFIX}email:{email}"
        data = cache.get(email_key, {'attempts': 0})
        return max(0, cls.MAX_ATTEMPTS - data['attempts'])


class GDPRCompliance:
    """
    GDPR compliance features for data protection.
    """
    
    @staticmethod
    def export_user_data(user):
        """Export all user data for GDPR compliance (Right to Access)."""
        from apps.courses.models import Enrollment, Review, Certificate
        from apps.ai_engine.models import ActivityLog
        
        data = {
            'personal_info': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
            },
            'enrollments': list(Enrollment.objects.filter(
                user=user
            ).values('course__title', 'enrolled_at', 'progress_percent', 'is_active')),
            'reviews': list(Review.objects.filter(
                user=user
            ).values('course__title', 'rating', 'comment', 'created_at')),
            'certificates': list(Certificate.objects.filter(
                user=user
            ).values('certificate_code', 'course__title', 'issued_at')),
            'activity_logs': list(ActivityLog.objects.filter(
                user=user
            ).values('action', 'created_at', 'metadata')[:100]),
        }
        
        # Log the export
        AuditEntry.objects.create(
            user=user,
            action=AuditEntry.ActionType.DATA_EXPORT,
            description=f"User data export requested",
            is_sensitive=True,
            risk_level='medium',
        )
        
        return data
    
    @staticmethod
    def delete_user_data(user):
        """
        Anonymize user data for GDPR compliance (Right to Erasure).
        Keeps audit records but removes PII.
        """
        # Anonymize user record
        user.email = f"deleted_{user.id}@anonymous.invalid"
        user.username = f"deleted_user_{user.id}"
        user.first_name = "Deleted"
        user.last_name = "User"
        user.is_active = False
        user.save()
        
        # Log the deletion
        AuditEntry.objects.create(
            action=AuditEntry.ActionType.DATA_DELETE,
            description=f"User data anonymized for user {user.id}",
            is_sensitive=True,
            risk_level='high',
            metadata={'original_email': user.email}
        )
        
        return True
    
    @staticmethod
    def get_data_retention_policy():
        """Return data retention policy information."""
        return {
            'user_data': 'Retained while account is active + 30 days after deletion',
            'activity_logs': 'Retained for 2 years for security analysis',
            'payment_records': 'Retained for 7 years per legal requirements',
            'audit_entries': 'Retained for 5 years for compliance',
            'course_content': 'Retained indefinitely while course is published',
        }

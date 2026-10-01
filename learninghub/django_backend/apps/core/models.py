import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('AUTH_LOGIN_SUCCESS', 'Auth: Login Success'),
        ('AUTH_LOGIN_FAILED', 'Auth: Login Failed'),
        ('AUTH_ACCOUNT_LOCKED', 'Auth: Account Locked'),
        ('AUTH_PASSWORD_CHANGE', 'Auth: Password Change'),
        ('AUTH_MFA_ENABLED', 'Auth: MFA Enabled'),
        ('AUTH_LOGOUT', 'Auth: Logout'),
        ('RBAC_ROLE_CHANGE', 'RBAC: Role Changed'),
        ('USER_DEACTIVATED', 'User: Deactivated / Banned'),
        ('COMMERCE_ORDER_PAID', 'Commerce: Order Paid'),
        ('COMMERCE_REFUND', 'Commerce: Order Refunded'),
        ('ACADEMIC_GRADE_OVERRIDE', 'Academic: Grade Overridden'),
        ('TEST_SUBMITTED', 'Test: Submitted'),
        ('CERTIFICATE_ISSUED', 'Certificate: Issued'),
        ('PROCTORING_VIOLATION', 'Proctoring: Violation Logged'),
        ('SECURITY_ALERT', 'Security: Alert Triggered'),
        ('CODE_SUBMISSION', 'DSA: Code Submitted'),
    )

    id = models.BigAutoField(primary_key=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_actions'
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_records'
    )
    action = models.CharField(max_length=64, choices=ACTION_CHOICES, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, null=True)
    details = models.JSONField(default=dict, blank=True)
    prev_hash = models.CharField(max_length=64, blank=True)
    entry_hash = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'lh_audit_logs'
        ordering = ['-id']
        indexes = [
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['actor', 'created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.pk:
            last_entry = AuditLog.objects.order_by('-id').first()
            self.prev_hash = last_entry.entry_hash if last_entry else '0' * 64
            created_str = self.created_at.isoformat() if self.created_at else timezone.now().isoformat()
            payload = f"{self.actor_id}:{self.action}:{created_str}:{self.prev_hash}:{self.details}"
            self.entry_hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.created_at}] {self.action} by {self.actor_id or 'System'}"

    @classmethod
    def record(cls, action, actor=None, target_user=None, ip_address=None, user_agent=None, details=None):
        try:
            return cls.objects.create(
                actor=actor if (actor and getattr(actor, 'is_authenticated', False)) else None,
                target_user=target_user,
                action=action,
                ip_address=ip_address,
                user_agent=user_agent[:500] if user_agent else None,
                details=details or {},
            )
        except Exception:
            return None

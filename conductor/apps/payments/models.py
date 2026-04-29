from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import BaseModel

class Coupon(BaseModel):
    """
    Discount Coupons for payments.
    """
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    # Legacy field - kept for backwards compatibility
    expires_at = models.DateTimeField(null=True, blank=True)
    # Courses this coupon applies to (empty = all courses)
    courses = models.ManyToManyField('courses.Course', blank=True, related_name='coupons')
    
    def is_valid(self):
        now = timezone.now()
        # Check active status
        if not self.is_active:
            return False
        # Check valid_from/valid_until if set
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        # Check legacy expires_at
        if self.expires_at and now > self.expires_at:
            return False
        # Check max uses
        if self.max_uses and self.used_count >= self.max_uses:
            return False
        return True

    def __str__(self):
        return f"{self.code} - {self.discount_percent}%"

class Payment(BaseModel):
    """
    Payment transaction record.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Gateway info
    gateway = models.CharField(max_length=50) # 'razorpay', 'stripe'
    gateway_order_id = models.CharField(max_length=100, blank=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True)
    
    # Coupon
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['gateway_payment_id']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.amount} {self.currency} - {self.status}"


class Subscription(BaseModel):
    """
    User Subscription Plan (Pro, Enterprise).
    """
    class PlanType(models.TextChoices):
        PRO = 'pro', 'Pro Plan'
        ENTERPRISE = 'enterprise', 'Enterprise Plan'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan_type = models.CharField(max_length=20, choices=PlanType.choices, default=PlanType.PRO)
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    
    # Gateway Subscription ID (if recurring)
    gateway_subscription_id = models.CharField(max_length=100, blank=True, null=True)

    def is_valid(self):
        return self.is_active and self.end_date > timezone.now()

    def __str__(self):
        return f"{self.user.email} - {self.plan_type}"

"""
Subscription and monetization models.
Supports free/pro/enterprise tiers, usage tracking, and premium feature gating.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class SubscriptionPlan(models.Model):
    """
    Subscription plan definitions.
    Defines pricing, features, and limits for each tier.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, db_index=True)  # free, pro, enterprise
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')

    # Usage limits
    daily_test_limit = models.IntegerField(default=3, help_text="Tests per day")
    monthly_ai_generations = models.IntegerField(default=5, help_text="AI-generated tests per month")
    max_analytics_depth = models.IntegerField(default=1, help_text="Analytics depth level (1-3)")
    max_bookmarks = models.IntegerField(default=20)
    max_notes = models.IntegerField(default=50)

    # Features (JSON for flexibility)
    # Example: {"instant_feedback": true, "detailed_explanations": true, "priority_support": false}
    features = models.JSONField(default=dict)

    # Display
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    badge_text = models.CharField(max_length=50, blank=True, help_text="e.g., 'Most Popular'")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['display_order']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def is_free(self):
        return self.price_monthly == 0


class UserSubscription(models.Model):
    """
    User's active or historical subscription.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='user_subscriptions')

    # Status
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
        ('trial', 'Trial'),
        ('past_due', 'Past Due'),
    ], default='active', db_index=True)

    # Billing
    billing_cycle = models.CharField(max_length=10, choices=[
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ], default='monthly')

    # Dates
    started_at = models.DateTimeField(auto_now_add=True)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Payment provider
    payment_provider = models.CharField(max_length=20, blank=True, choices=[
        ('stripe', 'Stripe'),
        ('razorpay', 'Razorpay'),
        ('paypal', 'PayPal'),
        ('manual', 'Manual'),
    ])
    provider_subscription_id = models.CharField(max_length=255, blank=True, db_index=True)
    provider_customer_id = models.CharField(max_length=255, blank=True)
    last_payment_id = models.CharField(max_length=255, blank=True)

    # Auto-renewal
    auto_renew = models.BooleanField(default=True)
    cancel_at_period_end = models.BooleanField(default=False)

    # Trial
    is_trial = models.BooleanField(default=False)
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_subscriptions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'current_period_end']),
            models.Index(fields=['provider_subscription_id']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} ({self.status})"

    @property
    def is_active(self):
        if self.status == 'active':
            return timezone.now() < self.current_period_end
        if self.status == 'trial':
            return self.trial_ends_at and timezone.now() < self.trial_ends_at
        return False

    @property
    def days_remaining(self):
        if not self.is_active:
            return 0
        end_date = self.trial_ends_at if self.status == 'trial' else self.current_period_end
        if not end_date:
            return 0
        delta = end_date - timezone.now()
        return max(0, delta.days)

    def has_feature(self, feature_key: str) -> bool:
        """Check if the plan includes a specific feature."""
        return self.plan.features.get(feature_key, False)

    def get_limit(self, limit_key: str) -> int:
        """Get a usage limit from the plan."""
        return getattr(self.plan, limit_key, 0)


class UsageTracking(models.Model):
    """
    Daily usage tracking per user.
    Used to enforce subscription limits.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='usage_tracking')
    date = models.DateField(db_index=True)

    # Usage counts
    tests_taken = models.IntegerField(default=0)
    ai_generations = models.IntegerField(default=0)
    minutes_practiced = models.IntegerField(default=0)
    bookmarks_created = models.IntegerField(default=0)
    notes_created = models.IntegerField(default=0)

    # Peak usage (for analytics)
    peak_concurrent_tests = models.IntegerField(default=0)

    class Meta:
        db_table = 'usage_tracking'
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} - {self.date}"

    @classmethod
    def get_today(cls, user):
        """Get or create today's usage record."""
        from django.utils import timezone
        today = timezone.now().date()
        record, _ = cls.objects.get_or_create(user=user, date=today)
        return record

    def increment(self, field_name, amount=1):
        """Increment a usage counter."""
        current = getattr(self, field_name, 0)
        setattr(self, field_name, current + amount)
        self.save(update_fields=[field_name])

    def check_limit(self, field_name, limit):
        """Check if a usage limit has been reached."""
        current = getattr(self, field_name, 0)
        return current < limit


class PaymentTransaction(models.Model):
    """
    Payment transaction records.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_transactions')
    subscription = models.ForeignKey(UserSubscription, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    # Transaction details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('disputed', 'Disputed'),
    ], default='pending')

    # Provider info
    provider = models.CharField(max_length=20, blank=True)
    provider_transaction_id = models.CharField(max_length=255, blank=True, db_index=True)
    provider_response = models.JSONField(default=dict, blank=True)

    # Type
    transaction_type = models.CharField(max_length=20, choices=[
        ('subscription_payment', 'Subscription Payment'),
        ('refund', 'Refund'),
        ('trial_conversion', 'Trial Conversion'),
        ('upgrade', 'Plan Upgrade'),
        ('downgrade', 'Plan Downgrade'),
    ])

    # Metadata
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['provider_transaction_id']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.amount} {self.currency} ({self.status})"


class Coupon(models.Model):
    """
    Discount coupons for subscriptions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)

    # Discount
    discount_type = models.CharField(max_length=20, choices=[
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ])
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Max discount for percentage type")

    # Applicability
    applicable_plans = models.ManyToManyField(SubscriptionPlan, blank=True, help_text="Leave empty for all plans")

    # Limits
    max_uses = models.IntegerField(null=True, blank=True, help_text="Null = unlimited")
    uses_per_user = models.IntegerField(default=1)
    current_uses = models.IntegerField(default=0)

    # Validity
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coupons'
        ordering = ['-valid_from']

    def __str__(self):
        return f"{self.code} ({self.discount_value}{'%' if self.discount_type == 'percentage' else ''})"

    @property
    def is_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True

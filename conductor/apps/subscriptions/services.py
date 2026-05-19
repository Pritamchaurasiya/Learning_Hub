"""
Subscription management service.
Handles plan upgrades, downgrades, usage enforcement, and billing.
"""
import logging
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

from .models import SubscriptionPlan, UserSubscription, UsageTracking, PaymentTransaction, Coupon

logger = logging.getLogger(__name__)


class SubscriptionManager:
    """Manages user subscriptions, upgrades, and billing."""

    @classmethod
    def get_user_subscription(cls, user):
        """Get the user's current active subscription."""
        return UserSubscription.objects.filter(
            user=user, status__in=['active', 'trial']
        ).select_related('plan').order_by('-started_at').first()

    @classmethod
    def get_user_plan(cls, user):
        """Get the user's current plan (defaults to free if no subscription)."""
        sub = cls.get_user_subscription(user)
        if sub and sub.is_active:
            return sub.plan

        # Return free plan
        return SubscriptionPlan.objects.filter(code='free', is_active=True).first()

    @classmethod
    def check_usage_limit(cls, user, limit_field):
        """
        Check if user has exceeded their usage limit.

        Args:
            user: The user to check
            limit_field: The field name (e.g., 'daily_test_limit', 'monthly_ai_generations')

        Returns:
            tuple: (has_limit, current_usage, limit)
        """
        plan = cls.get_user_plan(user)
        today_usage = UsageTracking.get_today(user)

        limit = getattr(plan, limit_field, 0)
        current = getattr(today_usage, limit_field.replace('_limit', ''), 0)

        # Free plan with 0 limit means unlimited (or change to strict limit)
        if limit == 0 and plan.is_free:
            return (True, current, float('inf'))

        has_remaining = current < limit
        return (has_remaining, current, limit)

    @classmethod
    @transaction.atomic
    def create_subscription(cls, user, plan_code, billing_cycle='monthly', coupon_code=None):
        """
        Create a new subscription for a user.

        Args:
            user: The user
            plan_code: Plan code (e.g., 'pro', 'enterprise')
            billing_cycle: 'monthly' or 'yearly'
            coupon_code: Optional coupon code

        Returns:
            UserSubscription object
        """
        try:
            plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise ValueError(f"Plan '{plan_code}' not found")

        if plan.is_free:
            raise ValueError("Cannot subscribe to free plan")

        # Cancel existing active subscription
        existing = cls.get_user_subscription(user)
        if existing and existing.is_active:
            existing.status = 'cancelled'
            existing.cancelled_at = timezone.now()
            existing.cancel_at_period_end = False
            existing.save(update_fields=['status', 'cancelled_at', 'cancel_at_period_end'])

        # Calculate period
        now = timezone.now()
        if billing_cycle == 'yearly':
            period_end = now + timedelta(days=365)
            price = plan.price_yearly
        else:
            period_end = now + timedelta(days=30)
            price = plan.price_monthly

        # Apply coupon
        discount = Decimal(0)
        if coupon_code:
            discount = cls._apply_coupon(user, coupon_code, plan, price)
            price -= discount

        # Create subscription
        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status='active',
            billing_cycle=billing_cycle,
            current_period_start=now,
            current_period_end=period_end,
            auto_renew=True,
        )

        # Record payment transaction
        PaymentTransaction.objects.create(
            user=user,
            subscription=subscription,
            amount=price,
            currency=plan.currency,
            status='completed',
            transaction_type='subscription_payment',
            description=f"{plan.name} {billing_cycle} subscription",
            metadata={
                'original_price': str(plan.price_yearly if billing_cycle == 'yearly' else plan.price_monthly),
                'discount': str(discount),
                'coupon_code': coupon_code,
            }
        )

        logger.info(f"Created subscription for {user.email}: {plan.code} ({billing_cycle})")
        return subscription

    @classmethod
    @transaction.atomic
    def cancel_subscription(cls, user, cancel_at_period_end=True):
        """Cancel a user's subscription."""
        subscription = cls.get_user_subscription(user)
        if not subscription:
            raise ValueError("No active subscription found")

        if cancel_at_period_end:
            subscription.cancel_at_period_end = True
            subscription.cancelled_at = timezone.now()
            subscription.save(update_fields=['cancel_at_period_end', 'cancelled_at'])
        else:
            subscription.status = 'cancelled'
            subscription.cancelled_at = timezone.now()
            subscription.current_period_end = timezone.now()
            subscription.save(update_fields=['status', 'cancelled_at', 'current_period_end'])

        logger.info(f"Cancelled subscription for {user.email}")
        return subscription

    @classmethod
    @transaction.atomic
    def start_trial(cls, user, plan_code='pro', trial_days=7):
        """Start a free trial for a user."""
        try:
            plan = SubscriptionPlan.objects.get(code=plan_code, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            raise ValueError(f"Plan '{plan_code}' not found")

        # Check if user already had a trial
        had_trial = UserSubscription.objects.filter(
            user=user, is_trial=True
        ).exists()

        if had_trial:
            raise ValueError("User already used a trial")

        now = timezone.now()
        trial_end = now + timedelta(days=trial_days)

        subscription = UserSubscription.objects.create(
            user=user,
            plan=plan,
            status='trial',
            billing_cycle='monthly',
            current_period_start=now,
            current_period_end=trial_end,
            is_trial=True,
            trial_ends_at=trial_end,
            auto_renew=True,
        )

        logger.info(f"Started {trial_days}-day trial for {user.email} on {plan_code}")
        return subscription

    @classmethod
    def _apply_coupon(cls, user, coupon_code, plan, price):
        """Apply a coupon and return discount amount."""
        try:
            coupon = Coupon.objects.get(code=coupon_code, is_active=True)
        except Coupon.DoesNotExist:
            raise ValueError("Invalid coupon code")

        if not coupon.is_valid:
            raise ValueError("Coupon is no longer valid")

        # Check user-specific limit
        user_uses = PaymentTransaction.objects.filter(
            user=user, metadata__coupon_code=coupon_code
        ).count()

        if user_uses >= coupon.uses_per_user:
            raise ValueError("Coupon already used maximum times")

        # Calculate discount
        if coupon.discount_type == 'percentage':
            discount = price * (coupon.discount_value / 100)
            if coupon.max_discount:
                discount = min(discount, coupon.max_discount)
        else:
            discount = min(coupon.discount_value, price)

        # Increment coupon uses
        coupon.current_uses += 1
        coupon.save(update_fields=['current_uses'])

        return discount

    @classmethod
    def cleanup_expired_subscriptions(cls):
        """Mark expired subscriptions as expired."""
        now = timezone.now()

        # Expire active subscriptions past their period end
        expired = UserSubscription.objects.filter(
            status='active',
            current_period_end__lt=now,
            auto_renew=False,
        )
        expired_count = expired.update(status='expired')

        # Expire trials past their trial end
        expired_trials = UserSubscription.objects.filter(
            status='trial',
            trial_ends_at__lt=now,
        )
        expired_trial_count = expired_trials.update(status='expired')

        logger.info(f"Expired {expired_count} subscriptions, {expired_trial_count} trials")
        return {'expired': expired_count, 'expired_trials': expired_trial_count}

    @classmethod
    def get_usage_summary(cls, user):
        """Get current usage vs plan limits."""
        plan = cls.get_user_plan(user)
        today_usage = UsageTracking.get_today(user)

        tests_limit = plan.daily_test_limit
        ai_limit = plan.monthly_ai_generations

        return {
            'date': today_usage.date,
            'plan_code': plan.code,
            'plan_name': plan.name,
            'tests_taken': today_usage.tests_taken,
            'tests_limit': tests_limit if tests_limit > 0 else float('inf'),
            'tests_remaining': max(0, tests_limit - today_usage.tests_taken) if tests_limit > 0 else float('inf'),
            'ai_generations': today_usage.ai_generations,
            'ai_generations_limit': ai_limit if ai_limit > 0 else float('inf'),
            'ai_generations_remaining': max(0, ai_limit - today_usage.ai_generations) if ai_limit > 0 else float('inf'),
            'minutes_practiced': today_usage.minutes_practiced,
            'is_over_limit': (
                (tests_limit > 0 and today_usage.tests_taken >= tests_limit) or
                (ai_limit > 0 and today_usage.ai_generations >= ai_limit)
            ),
        }

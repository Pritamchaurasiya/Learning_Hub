"""Subscription serializers."""
from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, UsageTracking, PaymentTransaction, Coupon


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    is_free = serializers.ReadOnlyField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'code', 'name', 'description',
            'price_monthly', 'price_yearly', 'currency',
            'daily_test_limit', 'monthly_ai_generations',
            'max_analytics_depth', 'max_bookmarks', 'max_notes',
            'features', 'is_active', 'is_featured', 'badge_text',
            'is_free',
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)
    is_active = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'status', 'billing_cycle',
            'started_at', 'current_period_start', 'current_period_end',
            'cancelled_at', 'expires_at', 'auto_renew',
            'cancel_at_period_end', 'is_trial', 'trial_ends_at',
            'is_active', 'days_remaining',
        ]


class UsageTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageTracking
        fields = [
            'date', 'tests_taken', 'ai_generations',
            'minutes_practiced', 'bookmarks_created', 'notes_created',
        ]


class UsageSummarySerializer(serializers.Serializer):
    """Current usage vs limits."""
    date = serializers.DateField()
    plan_code = serializers.CharField()
    plan_name = serializers.CharField()
    tests_taken = serializers.IntegerField()
    tests_limit = serializers.IntegerField()
    tests_remaining = serializers.IntegerField()
    ai_generations = serializers.IntegerField()
    ai_generations_limit = serializers.IntegerField()
    ai_generations_remaining = serializers.IntegerField()
    minutes_practiced = serializers.IntegerField()
    is_over_limit = serializers.BooleanField()


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'amount', 'currency', 'status',
            'provider', 'transaction_type', 'description',
            'created_at',
        ]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'description', 'discount_type',
            'discount_value', 'max_discount', 'is_valid',
            'valid_from', 'valid_until',
        ]


class CreateSubscriptionSerializer(serializers.Serializer):
    """Request to create/upgrade a subscription."""
    plan_code = serializers.CharField()
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'yearly'], default='monthly')
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField(required=False, allow_blank=True)


class CancelSubscriptionSerializer(serializers.Serializer):
    """Request to cancel a subscription."""
    cancel_at_period_end = serializers.BooleanField(default=True)

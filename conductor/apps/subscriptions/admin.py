"""Admin configuration for subscriptions."""
from django.contrib import admin
from .models import SubscriptionPlan, UserSubscription, UsageTracking, PaymentTransaction, Coupon


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'price_monthly', 'price_yearly', 'daily_test_limit', 'monthly_ai_generations', 'is_active', 'is_featured')
    list_filter = ('is_active', 'is_featured')
    search_fields = ('name', 'code')


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'billing_cycle', 'current_period_end', 'is_active', 'auto_renew')
    list_filter = ('status', 'billing_cycle', 'plan', 'auto_renew')
    search_fields = ('user__email', 'provider_subscription_id')
    list_select_related = ('user', 'plan')
    date_hierarchy = 'started_at'


@admin.register(UsageTracking)
class UsageTrackingAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'tests_taken', 'ai_generations', 'minutes_practiced')
    list_filter = ('date',)
    search_fields = ('user__email',)
    date_hierarchy = 'date'


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'currency', 'status', 'provider', 'transaction_type', 'created_at')
    list_filter = ('status', 'provider', 'transaction_type')
    search_fields = ('user__email', 'provider_transaction_id')
    list_select_related = ('user',)
    date_hierarchy = 'created_at'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'current_uses', 'max_uses', 'is_valid', 'valid_until')
    list_filter = ('discount_type', 'is_active')
    search_fields = ('code',)

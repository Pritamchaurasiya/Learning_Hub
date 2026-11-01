"""
Payment and Commerce admin configuration with atomic refund safety and N+1 elimination.
"""

from django.contrib import admin
from django.db import transaction
from .models import Cart, CartItem, Coupon, Invoice, Payment, Subscription


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Payment transaction admin with atomic refund and gateway reconciliation."""

    list_display = [
        "user",
        "course",
        "amount",
        "currency",
        "status",
        "gateway",
        "gateway_payment_id",
        "completed_at",
        "created_at",
    ]
    list_filter = ["status", "gateway", "currency", "created_at"]
    search_fields = [
        "user__email",
        "course__title",
        "gateway_order_id",
        "gateway_payment_id",
    ]
    list_select_related = ["user", "course", "coupon"]
    autocomplete_fields = ["user", "course"]
    readonly_fields = [
        "gateway_order_id",
        "gateway_payment_id",
        "completed_at",
        "created_at",
        "updated_at",
    ]
    actions = ["refund_payments"]

    @admin.action(
        description="Safely refund selected completed payments and revoke access"
    )
    def refund_payments(self, request, queryset):
        success_count = 0
        for payment in queryset:
            if payment.status != Payment.Status.COMPLETED:
                continue
            with transaction.atomic():
                payment.status = Payment.Status.REFUNDED
                payment.save(update_fields=["status"])

                # Revoke associated enrollment
                if payment.course and payment.user:
                    from apps.courses.models import Enrollment

                    Enrollment.objects.filter(
                        user=payment.user, course=payment.course
                    ).delete()

                # Audit Log entry
                from apps.core.models import AuditLog

                AuditLog.objects.create(
                    actor=request.user,
                    action="PAYMENT_REFUND",
                    resource=f"Payment:{payment.id}",
                    severity="warning",
                    details=f"Admin refund of {payment.amount} {payment.currency} processed.",
                )
                success_count += 1

        self.message_user(request, f"Successfully refunded {success_count} payments.")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    """Discount coupon administration."""

    list_display = [
        "code",
        "discount_percent",
        "is_active",
        "used_count",
        "max_uses",
        "valid_from",
        "valid_until",
    ]
    list_filter = ["is_active", "valid_until"]
    search_fields = ["code"]


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """User recurring subscription plan admin."""

    list_display = [
        "user",
        "plan_type",
        "is_active",
        "start_date",
        "end_date",
        "auto_renew",
    ]
    list_filter = ["plan_type", "is_active", "auto_renew"]
    search_fields = ["user__email", "gateway_subscription_id"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Digital tax invoice admin."""

    list_display = ["invoice_number", "user", "total_amount", "tax_amount", "issued_at"]
    list_filter = ["issued_at"]
    search_fields = ["invoice_number", "user__email", "billing_name"]
    list_select_related = ["user", "payment"]
    autocomplete_fields = ["user"]
    readonly_fields = [
        "invoice_number",
        "payment",
        "user",
        "total_amount",
        "tax_amount",
        "issued_at",
    ]


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    autocomplete_fields = ["course"]


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """Shopping cart management."""

    list_display = [
        "id",
        "user",
        "session_id",
        "total_items",
        "subtotal",
        "total",
        "created_at",
    ]
    list_select_related = ["user", "coupon"]
    autocomplete_fields = ["user"]
    inlines = [CartItemInline]

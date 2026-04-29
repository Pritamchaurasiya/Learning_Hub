"""Payment admin."""

from django.contrib import admin
from .models import Payment, Coupon


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "amount", "status", "gateway", "created_at"]
    list_filter = ["status", "gateway", "created_at"]
    search_fields = ["user__email", "course__title"]
    actions = ["refund_payments"]

    @admin.action(description="Mark selected payments as Refunded")
    def refund_payments(self, request, queryset):
        # In a real app, this would trigger the Gateway Refund API
        updated_count = queryset.update(status=Payment.Status.REFUNDED)
        self.message_user(request, f"{updated_count} payments marked as refunded.")



@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "discount_percent",
        "used_count",
        "max_uses",
    ]
    list_filter = ["expires_at"]

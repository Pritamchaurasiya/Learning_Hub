"""Payment admin."""

from django.contrib import admin
from .models import Payment, Coupon


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "amount", "status", "gateway", "created_at"]
    list_filter = ["status", "gateway", "created_at"]
    search_fields = ["user__email", "course__title"]


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "discount_percent",
        "used_count",
        "max_uses",
        "is_active",
        "valid_until",
    ]
    list_filter = ["is_active"]

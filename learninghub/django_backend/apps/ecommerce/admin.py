from django.contrib import admin
from django.utils.html import format_html
from django.db import transaction
from .models import (
    Coupon,
    Cart,
    CartItem,
    Certificate,
    Web3Profile,
    Contest,
    Order,
    OrderItem,
    PaymentTransaction,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    autocomplete_fields = ['course']
    fields = ('course', 'price', 'quantity')


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    autocomplete_fields = ['course']
    fields = ('course', 'price', 'quantity', 'added_at')
    readonly_fields = ('added_at',)


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'is_active', 'valid_until')
    list_filter = ('is_active', 'valid_until')
    search_fields = ('code',)
    ordering = ('-valid_until',)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_id', 'applied_coupon', 'created_at', 'updated_at')
    search_fields = ('id', 'user__email', 'user__username', 'session_id')
    list_filter = ('created_at',)
    autocomplete_fields = ['user', 'applied_coupon']
    list_select_related = ['user', 'applied_coupon']
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'course', 'price', 'quantity', 'added_at')
    search_fields = ('id', 'cart__id', 'course__title')
    autocomplete_fields = ['cart', 'course']
    list_select_related = ['cart', 'course']


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_code', 'user', 'course', 'title', 'is_revoked_badge', 'issued_at')
    list_filter = ('is_revoked', 'issued_at')
    search_fields = ('certificate_code', 'user__email', 'user__username', 'title')
    autocomplete_fields = ['user', 'course']
    list_select_related = ['user', 'course']
    readonly_fields = ('certificate_code', 'signature', 'issued_at')
    actions = ['revoke_certificates', 'reinstate_certificates']

    @admin.display(description="Status")
    def is_revoked_badge(self, obj):
        if obj.is_revoked:
            return format_html('<span style="color:red; font-weight:bold;">Revoked</span>')
        return format_html('<span style="color:green; font-weight:bold;">Active</span>')

    @admin.action(description="Revoke selected certificates")
    def revoke_certificates(self, request, queryset):
        count = queryset.update(is_revoked=True)
        self.message_user(request, f"{count} certificate(s) were successfully revoked.")

    @admin.action(description="Reinstate selected certificates")
    def reinstate_certificates(self, request, queryset):
        count = queryset.update(is_revoked=False)
        self.message_user(request, f"{count} certificate(s) were reinstated.")


@admin.register(Web3Profile)
class Web3ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'wallet_address', 'network', 'created_at')
    search_fields = ('user__email', 'wallet_address', 'did')
    list_filter = ('network', 'created_at')
    autocomplete_fields = ['user']
    list_select_related = ['user']


@admin.register(Contest)
class ContestAdmin(admin.ModelAdmin):
    list_display = ('contest_id', 'title', 'status', 'difficulty', 'start_time', 'end_time', 'duration', 'participants')
    list_filter = ('status', 'difficulty', 'start_time')
    search_fields = ('contest_id', 'title')
    ordering = ('-start_time',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'total_amount',
        'status_badge',
        'payment_method',
        'idempotency_key',
        'created_at',
    )
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('id', 'user__email', 'user__username', 'idempotency_key', 'gateway_order_id', 'gateway_payment_id')
    autocomplete_fields = ['user', 'coupon']
    list_select_related = ['user', 'coupon']
    readonly_fields = ('id', 'created_at', 'updated_at', 'idempotency_key', 'webhook_received_at')
    inlines = [OrderItemInline]
    actions = ['mark_as_refunded']

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            'COMPLETED': 'green',
            'PENDING': 'orange',
            'FAILED': 'red',
            'REFUNDED': 'gray',
        }
        color = colors.get(obj.status, 'black')
        return format_html(f'<span style="color:{color}; font-weight:bold;">{obj.status}</span>')

    @admin.action(description="Mark selected orders as REFUNDED (safe atomic action)")
    def mark_as_refunded(self, request, queryset):
        with transaction.atomic():
            count = queryset.exclude(status='REFUNDED').update(status='REFUNDED')
        self.message_user(request, f"{count} order(s) marked as REFUNDED.")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'course', 'price', 'quantity')
    search_fields = ('id', 'order__id', 'course__title')
    autocomplete_fields = ['order', 'course']
    list_select_related = ['order', 'course']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'amount', 'currency', 'status', 'gateway_reference', 'created_at')
    list_filter = ('status', 'currency', 'created_at')
    search_fields = ('id', 'order__id', 'gateway_reference')
    autocomplete_fields = ['order']
    list_select_related = ['order']
    readonly_fields = ('id', 'created_at')

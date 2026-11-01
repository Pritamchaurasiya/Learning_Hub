"""
Enhanced Payment Serializers with Comprehensive Validation
"""

from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from apps.courses.models import Course
from .models import Payment, Coupon


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating payment orders with validation."""

    course_id = serializers.UUIDField(required=True)
    coupon_code = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        help_text="Optional coupon code for discount",
    )
    gateway = serializers.ChoiceField(
        choices=["razorpay", "stripe"],
        default="razorpay",
        help_text="Payment gateway to use",
    )

    def validate_course_id(self, value):
        """Validate course exists and is purchasable."""
        try:
            course = Course.objects.get(id=value, is_published=True)
            if course.is_free:
                raise serializers.ValidationError(
                    "Cannot create payment for free course"
                )
            return value
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found or not published")

    def validate_coupon_code(self, value):
        """Validate coupon if provided."""
        if not value or not value.strip():
            return None

        code = value.strip().upper()
        try:
            coupon = Coupon.objects.get(code=code)
            if not coupon.is_valid():
                raise serializers.ValidationError("Coupon is expired or invalid")
            return code
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code")

    def validate(self, attrs):
        """Cross-field validation."""
        course_id = attrs.get("course_id")
        coupon_code = attrs.get("coupon_code")

        # Check if coupon applies to this course
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code.upper())
                # If coupon has specific courses, check if this course is included
                if (
                    coupon.courses.exists()
                    and not coupon.courses.filter(id=course_id).exists()
                ):
                    raise serializers.ValidationError(
                        {
                            "coupon_code": "This coupon does not apply to the selected course"
                        }
                    )
            except Coupon.DoesNotExist:
                pass  # Already validated in field validator

        return attrs


class VerifyPaymentSerializer(serializers.Serializer):
    """Serializer for verifying payment completion."""

    payment_id = serializers.UUIDField(
        required=True, help_text="Our internal payment ID"
    )
    gateway_payment_id = serializers.CharField(
        max_length=200,
        required=True,
        help_text="Payment ID from gateway (Razorpay/Stripe)",
    )
    gateway_order_id = serializers.CharField(
        max_length=200, required=False, help_text="Order ID from gateway"
    )
    signature = serializers.CharField(
        max_length=500,
        required=False,
        help_text="Signature for verification (Razorpay)",
    )

    def validate_payment_id(self, value):
        """Validate payment exists and is in correct state."""
        try:
            payment = Payment.objects.get(id=value)
            if payment.status == Payment.Status.COMPLETED:
                raise serializers.ValidationError("Payment already completed")
            if payment.status == Payment.Status.FAILED:
                raise serializers.ValidationError("Payment has failed")
            return value
        except Payment.DoesNotExist:
            raise serializers.ValidationError("Payment record not found")


class ApplyCouponSerializer(serializers.Serializer):
    """Serializer for applying coupon codes."""

    code = serializers.CharField(max_length=50, required=True, allow_blank=False)
    course_id = serializers.UUIDField(required=True)

    def validate_code(self, value):
        """Validate coupon code."""
        if not value or not value.strip():
            raise serializers.ValidationError("Coupon code is required")

        code = value.strip().upper()
        try:
            coupon = Coupon.objects.get(code=code)
            if not coupon.is_valid():
                if not coupon.is_active:
                    raise serializers.ValidationError("This coupon is no longer active")
                elif coupon.max_uses and coupon.used_count >= coupon.max_uses:
                    raise serializers.ValidationError(
                        "This coupon has reached its usage limit"
                    )
                else:
                    raise serializers.ValidationError("This coupon has expired")
            return code
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code")

    def validate_course_id(self, value):
        """Validate course exists."""
        try:
            Course.objects.get(id=value, is_published=True)
            return value
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found")

    def validate(self, attrs):
        """Validate coupon applies to course and meets minimum order value."""
        code = attrs.get("code").upper()
        course_id = attrs.get("course_id")

        try:
            coupon = Coupon.objects.get(code=code)
            course = Course.objects.get(id=course_id)

            # Check if coupon is restricted to specific courses
            if (
                coupon.courses.exists()
                and not coupon.courses.filter(id=course_id).exists()
            ):
                raise serializers.ValidationError(
                    {"code": "This coupon cannot be applied to this course"}
                )

            # Check minimum order value
            if coupon.minimum_order_value and course.price < coupon.minimum_order_value:
                raise serializers.ValidationError(
                    {
                        "code": f"Minimum order value of {coupon.minimum_order_value} required for this coupon"
                    }
                )

        except (Coupon.DoesNotExist, Course.DoesNotExist):
            pass  # Already handled in field validators

        return attrs


class RefundSerializer(serializers.Serializer):
    """Serializer for processing refunds."""

    payment_id = serializers.UUIDField(required=True)
    reason = serializers.CharField(
        max_length=500, required=True, allow_blank=False, help_text="Reason for refund"
    )
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=Decimal("0.01"),
        help_text="Partial refund amount (optional, full refund by default)",
    )

    def validate_payment_id(self, value):
        """Validate payment can be refunded."""
        try:
            payment = Payment.objects.get(id=value)
            if payment.status != Payment.Status.COMPLETED:
                raise serializers.ValidationError(
                    "Only completed payments can be refunded"
                )
            if payment.status == Payment.Status.REFUNDED:
                raise serializers.ValidationError("Payment already refunded")

            # Check refund window (e.g., 30 days)
            if payment.completed_at:
                days_since_payment = (timezone.now() - payment.completed_at).days
                if days_since_payment > 30:
                    raise serializers.ValidationError(
                        "Refund window has expired (30 days)"
                    )

            return value
        except Payment.DoesNotExist:
            raise serializers.ValidationError("Payment not found")

    def validate_reason(self, value):
        """Validate refund reason."""
        if not value or not value.strip():
            raise serializers.ValidationError("Refund reason is required")
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Please provide a detailed reason (minimum 10 characters)"
            )
        return value.strip()

    def validate(self, attrs):
        """Validate refund amount doesn't exceed payment amount."""
        payment_id = attrs.get("payment_id")
        amount = attrs.get("amount")

        if amount:
            try:
                payment = Payment.objects.get(id=payment_id)
                if amount > payment.amount:
                    raise serializers.ValidationError(
                        {"amount": "Refund amount cannot exceed payment amount"}
                    )
            except Payment.DoesNotExist:
                pass  # Already handled

        return attrs


class PaymentStatsSerializer(serializers.Serializer):
    """Serializer for payment statistics."""

    total_revenue = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_payments = serializers.IntegerField(read_only=True)
    completed_payments = serializers.IntegerField(read_only=True)
    pending_payments = serializers.IntegerField(read_only=True)
    failed_payments = serializers.IntegerField(read_only=True)
    refunded_payments = serializers.IntegerField(read_only=True)
    average_transaction = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )
    currency = serializers.CharField(read_only=True)


class PaymentListSerializer(serializers.ModelSerializer):
    """Serializer for payment list view."""

    course_title = serializers.CharField(source="course.title", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    coupon_code = serializers.CharField(
        source="coupon.code", read_only=True, allow_null=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "user_email",
            "course_title",
            "amount",
            "currency",
            "status",
            "status_display",
            "gateway",
            "coupon_code",
            "discount_amount",
            "created_at",
            "completed_at",
        ]
        read_only_fields = fields


class PaymentDetailSerializer(serializers.ModelSerializer):
    """Detailed payment serializer."""

    course = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    coupon = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "user",
            "course",
            "amount",
            "original_amount",
            "currency",
            "status",
            "gateway",
            "gateway_order_id",
            "gateway_payment_id",
            "coupon",
            "discount_amount",
            "ip_address",
            "created_at",
            "completed_at",
            "failed_at",
            "refunded_at",
            "metadata",
        ]
        read_only_fields = fields

    def get_course(self, obj):
        """Get course details."""
        if obj.course:
            return {
                "id": str(obj.course.id),
                "title": obj.course.title,
                "slug": obj.course.slug,
                "price": float(obj.course.price),
            }
        return None

    def get_user(self, obj):
        """Get user details."""
        return {
            "id": str(obj.user.id),
            "email": obj.user.email,
            "username": obj.user.username,
        }

    def get_coupon(self, obj):
        """Get coupon details if applied."""
        if obj.coupon:
            return {
                "code": obj.coupon.code,
                "discount_percent": float(obj.coupon.discount_percent),
            }
        return None

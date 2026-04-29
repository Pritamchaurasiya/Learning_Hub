"""Payment serializers."""

from rest_framework import serializers
from .models import Payment, Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ["id", "code", "discount_percent", "valid_until"]


class PaymentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "course_title",
            "amount",
            "currency",
            "status",
            "discount_amount",
            "created_at",
            "completed_at",
        ]


class CreateOrderSerializer(serializers.Serializer):
    course_id = serializers.UUIDField(required=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True)

    def validate_course_id(self, value):
        from apps.courses.models import Course
        if not Course.objects.filter(id=value, is_published=True).exists():
            raise serializers.ValidationError("Course not found or not available.")
        return value


class VerifyPaymentSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField(required=True)
    gateway_payment_id = serializers.CharField(required=True)


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)
    course_id = serializers.UUIDField(required=False)


class VerifySubscriptionSerializer(serializers.Serializer):
    """
    Verify a subscription payment logic.
    """
    razorpay_payment_id = serializers.CharField(required=True)
    razorpay_order_id = serializers.CharField(required=True)
    razorpay_signature = serializers.CharField(required=True)
    plan_type = serializers.CharField(required=False, default='pro')


class RefundSerializer(serializers.Serializer):
    """Serializer for refund requests."""
    payment_id = serializers.UUIDField(required=True, help_text="ID of the completed payment to refund")

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


class VerifyPaymentSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField(required=True)
    gateway_payment_id = serializers.CharField(required=True)


class ApplyCouponSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)
    course_id = serializers.UUIDField(required=False)

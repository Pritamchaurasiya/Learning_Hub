"""
Cart Serializers for LearningHub Commerce API.
Matches frontend TypeScript contracts exactly.
"""

from rest_framework import serializers
from .models import Cart, CartItem, Coupon
from apps.courses.models import Course


class CartCourseSerializer(serializers.ModelSerializer):
    instructor = serializers.SerializerMethodField()
    original_price = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "thumbnail",
            "instructor",
            "price",
            "original_price",
        ]

    def get_instructor(self, obj):
        if obj.instructor:
            return {
                "id": str(obj.instructor.id),
                "display_name": getattr(obj.instructor, "display_name", None) or getattr(obj.instructor, "username", "Instructor"),
            }
        return {"display_name": "LearningHub"}

    def get_original_price(self, obj):
        return getattr(obj, "original_price", None) or float(obj.price or 0)

    def get_thumbnail(self, obj):
        if obj.thumbnail:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class CartItemSerializer(serializers.ModelSerializer):
    course = CartCourseSerializer(read_only=True)
    added_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "course", "quantity", "added_at"]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    subtotal = serializers.ReadOnlyField()
    discount = serializers.ReadOnlyField()
    total = serializers.ReadOnlyField()
    currency = serializers.ReadOnlyField()
    coupon_code = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "total_items",
            "subtotal",
            "discount",
            "total",
            "currency",
            "coupon_code",
            "created_at",
            "updated_at",
        ]

    def get_coupon_code(self, obj):
        return obj.coupon.code if obj.coupon else None

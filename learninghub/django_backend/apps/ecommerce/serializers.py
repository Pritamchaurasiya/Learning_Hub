from rest_framework import serializers
from .models import Cart, CartItem, Coupon, Certificate, Web3Profile, Contest, Order, OrderItem, PaymentTransaction
from apps.courses.serializers import CourseListSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'course', 'price', 'quantity']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'total_amount', 'subtotal_amount', 'discount_amount', 'status', 'payment_method', 'items', 'created_at',
                  'idempotency_key', 'gateway_order_id', 'gateway_payment_id', 'paid_at', 'webhook_received_at',
                  'failure_reason', 'metadata']

class CartItemSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)
    course_id = serializers.CharField(source='course.id', read_only=True)
    title = serializers.CharField(source='course.title', read_only=True)
    thumbnail = serializers.CharField(source='course.thumbnail_url', read_only=True)
    instructor = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, source='course.price', read_only=True)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2, source='course.original_price', read_only=True)
    course_title = serializers.CharField(read_only=True)
    course_thumbnail = serializers.CharField(read_only=True)
    instructor_name = serializers.CharField(read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = CartItem
        fields = ['id', 'course_id', 'course', 'title', 'thumbnail', 'instructor', 'price', 'original_price', 
                  'course_title', 'course_thumbnail', 'instructor_name', 'price', 'original_price', 'quantity', 'added_at']

    def get_instructor(self, obj):
        if obj.course.instructor:
            return {'display_name': obj.course.instructor.username}
        return {'display_name': 'Instructor'}

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    summary = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'summary', 'created_at', 'updated_at']

    def get_summary(self, obj):
        recalc = obj.recalculate()
        return {
            'total_items': recalc['total_items'],
            'subtotal': recalc['subtotal'],
            'discount': recalc['discount'],
            'total': recalc['total'],
            'currency': 'USD',
        }

class CartResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    data = serializers.DictField()

class CartItemResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    data = serializers.DictField()

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class CertificateSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)

    class Meta:
        model = Certificate
        fields = ['id', 'certificate_code', 'title', 'course', 'issued_at', 'signature', 'download_url', 'is_revoked']

class Web3ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Web3Profile
        fields = ['did', 'wallet_address', 'network', 'nft_certificates', 'created_at']

class ContestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contest
        fields = '__all__'

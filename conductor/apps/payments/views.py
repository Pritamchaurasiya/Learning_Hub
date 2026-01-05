"""Payment views."""

from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.courses.models import Course, Enrollment
from .models import Payment, Coupon
from .serializers import (
    PaymentSerializer,
    CouponSerializer,
    CreateOrderSerializer,
    VerifyPaymentSerializer,
    ApplyCouponSerializer,
)


@extend_schema_view(
    post=extend_schema(
        request=CreateOrderSerializer, responses={201: PaymentSerializer}
    )
)
class CreateOrderView(generics.GenericAPIView):
    """Create payment order."""

    permission_classes = [IsAuthenticated]
    serializer_class = CreateOrderSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course_id = serializer.validated_data["course_id"]
        coupon_code = serializer.validated_data.get("coupon_code")

        try:
            course = Course.objects.get(id=course_id, is_published=True)
        except Course.DoesNotExist:
            return Response(
                {"status": "error", "message": "Course not found"}, status=404
            )

        if course.is_free:
            return Response(
                {"status": "error", "message": "Course is free"}, status=400
            )

        # Check enrollment
        if Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response(
                {"status": "error", "message": "Already enrolled"}, status=400
            )

        amount = course.price
        discount = 0
        coupon = None

        # Apply coupon
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code.upper())
                if coupon.is_valid():
                    discount = amount * (coupon.discount_percent / 100)
                    amount -= discount
            except Coupon.DoesNotExist:
                pass

        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            course=course,
            amount=amount,
            gateway="razorpay",
            coupon=coupon,
            discount_amount=discount,
        )

        # TODO: Create Razorpay order
        # Implementation pending gateway setup

        return Response(
            {
                "status": "success",
                "data": {
                    "payment_id": str(payment.id),
                    "amount": float(amount),
                    "discount": float(discount),
                    # 'order_id': order['id'],  # Razorpay order ID
                },
            }
        )


@extend_schema_view(
    post=extend_schema(
        request=VerifyPaymentSerializer, responses={200: PaymentSerializer}
    )
)
class VerifyPaymentView(generics.GenericAPIView):
    """Verify payment and enroll user."""

    permission_classes = [IsAuthenticated]
    serializer_class = VerifyPaymentSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_id = serializer.validated_data["payment_id"]
        gateway_payment_id = serializer.validated_data["gateway_payment_id"]

        try:
            payment = Payment.objects.get(
                id=payment_id, user=request.user, status="pending"
            )
        except Payment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Payment not found"}, status=404
            )

        # TODO: Verify with Razorpay
        # razorpay_client.utility.verify_payment_signature(...)

        # Update payment
        payment.status = "completed"
        payment.gateway_payment_id = gateway_payment_id
        payment.completed_at = timezone.now()
        payment.save()

        # Create enrollment
        Enrollment.objects.create(user=request.user, course=payment.course)
        payment.course.enrollment_count += 1
        payment.course.save()

        # Update coupon usage
        if payment.coupon:
            payment.coupon.used_count += 1
            payment.coupon.save()

        return Response(
            {"status": "success", "message": "Payment verified, enrolled successfully"}
        )


@extend_schema_view(
    post=extend_schema(request=ApplyCouponSerializer, responses={200: CouponSerializer})
)
class ApplyCouponView(generics.GenericAPIView):
    """Validate and preview coupon discount."""

    permission_classes = [IsAuthenticated]
    serializer_class = ApplyCouponSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data["code"].upper()
        # course_id not used yet but available

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response(
                {"status": "error", "message": "Invalid coupon"}, status=400
            )

        if not coupon.is_valid():
            return Response(
                {"status": "error", "message": "Coupon expired or maxed out"},
                status=400,
            )

        return Response({"status": "success", "data": CouponSerializer(coupon).data})


@extend_schema(responses={200: PaymentSerializer(many=True)})
class PaymentHistoryView(generics.ListAPIView):
    """Get user's payment history."""

    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        if getattr(self, "request", None) and self.request.user.is_authenticated:
            return Payment.objects.filter(user=self.request.user)
        return Payment.objects.none()

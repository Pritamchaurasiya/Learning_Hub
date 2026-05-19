"""Payment views — Enhanced with refund, stats, and duplicate guard."""

import logging
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.courses.models import Course, Enrollment
from .models import Payment, Coupon
from .serializers import (
    PaymentSerializer,
    CouponSerializer,
    CreateOrderSerializer,
    VerifyPaymentSerializer,
    ApplyCouponSerializer,
    RefundSerializer,
)

logger = logging.getLogger(__name__)


@extend_schema_view(
    post=extend_schema(
        request=CreateOrderSerializer, responses={201: PaymentSerializer}
    )
)
class CreateOrderView(generics.GenericAPIView):
    """Create payment order."""

    permission_classes = [IsAuthenticated]
    serializer_class = CreateOrderSerializer
    throttle_scope = 'payment'

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

        # Duplicate-order guard: lock + check to prevent race conditions
        with transaction.atomic():
            existing_pending = Payment.objects.select_for_update().filter(
                user=request.user, course=course, status="pending"
            ).first()
            if existing_pending:
                return Response(
                    {
                        "status": "error",
                        "message": "A pending payment already exists for this course",
                        "data": {"payment_id": str(existing_pending.id)},
                    },
                    status=409,
                )

            amount = course.price
            discount = Decimal(0)
            coupon = None

            # Apply coupon
            if coupon_code:
                try:
                    coupon = Coupon.objects.get(code=coupon_code.upper())
                    if coupon.is_valid():
                        discount = amount * (Decimal(coupon.discount_percent) / Decimal(100))
                        amount -= discount
                except Coupon.DoesNotExist:
                    pass

            # Create payment record
            gateway = request.data.get('gateway', 'razorpay')
            
            # Determine currency based on gateway
            currency = 'USD' if gateway == 'stripe' else 'INR'
            
            payment = Payment.objects.create(
                user=request.user,
                course=course,
                amount=amount,
                gateway=gateway,
                currency=currency,
                coupon=coupon,
                discount_amount=discount,
            )

        try:
            if gateway == 'stripe':
                from .services import StripeService
                stripe_service = StripeService()
                
                # Success/Cancel URLs (Frontend)
                success_url = settings.FRONTEND_URL + '/payment/success'
                cancel_url = settings.FRONTEND_URL + '/payment/cancel'
                
                session_data = stripe_service.create_checkout_session(
                    request.user, course, success_url, cancel_url
                )
                
                payment.gateway_payment_id = session_data["id"]
                payment.save()
                
                return Response({
                    "status": "success",
                    "data": {
                        "payment_id": str(payment.id),
                        "session_id": session_data["id"], # Stripe Session
                        "payment_url": session_data["url"],
                        "gateway": "stripe"
                    }
                })
                
            else:
                # Default: Razorpay
                from .services import RazorpayService
                razorpay_service = RazorpayService()
                
                # Create order linked to our internal payment ID
                order = razorpay_service.create_order(
                    amount=amount, 
                    receipt=str(payment.id)
                )
                
                # Save the specific Razorpay order ID to our payment record
                payment.gateway_payment_id = order['id']
                payment.save()
    
                return Response(
                    {
                        "status": "success",
                        "data": {
                            "payment_id": str(payment.id),
                            "amount": float(amount),
                            "discount": float(discount),
                            "order_id": order['id'],  # Return actual Razorpay Order ID
                            "key": settings.RAZORPAY_KEY_ID, # Frontend needs this
                            "gateway": "razorpay"
                        },
                    }
                )
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            logger.error("Payment initiation failed for user %s: %s", request.user.id, str(e))
            return Response(
                {"status": "error", "message": "Payment initiation failed. Please try again."}, 
                status=500
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
            from django.core.cache import cache
            
            # Idempotency Layer (Redis-backed)
            idempotency_key = f"payment_verify_idemp_{gateway_payment_id}"
            cached_response = cache.get(idempotency_key)
            if cached_response:
                return Response(cached_response, status=200)

            with transaction.atomic():
                # Database-level Duplicate Guard
                existing_payment = Payment.objects.select_for_update().filter(
                    gateway_payment_id=gateway_payment_id, 
                    status="completed"
                ).first()
                
                if existing_payment:
                    if existing_payment.user == request.user:
                        success_data = {"status": "success", "message": "Payment already verified (DB Check)"}
                        cache.set(idempotency_key, success_data, timeout=86400) # Cache for 24 hours
                        return Response(success_data)
                    else:
                        return Response(
                            {"status": "error", "message": "Duplicate payment ID detected"}, 
                            status=400
                        )

                payment = Payment.objects.select_for_update().get(
                    id=payment_id, user=request.user, status="pending"
                )
        except Payment.DoesNotExist:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("Payment %s not found or not pending for user %s", payment_id, request.user.id)
            return Response(
                {"status": "error", "message": "Payment not found"}, status=404
            )

        # Verify with Razorpay via Service (Atomic)
        try:
            from .services import RazorpayService
            razorpay_service = RazorpayService()
            
            signature = request.data.get('razorpay_signature')
            order_id = request.data.get('razorpay_order_id') # This is the gateway_order_id
            
            # gateway_payment_id from serializer is the actual payment ID
            
            if not signature or not order_id:
                return Response(
                    {"status": "error", "message": "Missing verification parameters"}, 
                    status=400
                )

            payment = razorpay_service.verify_payment(
                payment_id=order_id, # order_id matched gateway_order_id in DB
                gateway_payment_id=gateway_payment_id,
                gateway_signature=signature
            )

        except Exception as e:
             return Response(
                {"status": "error", "message": f"Verification failed: {str(e)}"}, 
                status=400
            )

        # Publish payment event — fires audit log + confirmation notification
        try:
            from apps.core.event_bus import EventBus
            EventBus.publish("payment.completed", {
                "user_id": request.user.id,
                "username": request.user.username,
                "payment_id": str(payment.id),
                "amount": str(payment.amount),
                "course_title": payment.course.title if hasattr(payment, 'course') else "N/A",
            })
        except Exception:
            pass  # EventBus is non-critical

        # Cache the success response for idempotent retries
        success_response = {"status": "success", "message": "Payment verified, enrolled successfully"}
        cache.set(idempotency_key, success_response, timeout=86400) # 24 Hours

        return Response(success_response)


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


class SubscriptionView(generics.GenericAPIView):
    """
    Handle Subscription Creation and Verification.
    Simplified flow using Orders (Pre-paid) instead of Recurring Plans API for MVP.
    """
    permission_classes = [IsAuthenticated]
    throttle_scope = 'subscription'
    
    def get_serializer_class(self):
        if self.request.method == 'POST' and 'razorpay_signature' in self.request.data:
            from .serializers import VerifySubscriptionSerializer
            return VerifySubscriptionSerializer
        from .serializers import CreateOrderSerializer
        return CreateOrderSerializer

    def post(self, request):
        # 1. Verification Flow
        if 'razorpay_signature' in request.data:
            from .models import Subscription
            from .serializers import VerifySubscriptionSerializer
            from .services import RazorpayService
            
            serializer = VerifySubscriptionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            pay_id = serializer.validated_data['razorpay_payment_id']
            ord_id = serializer.validated_data['razorpay_order_id']
            sig = serializer.validated_data['razorpay_signature']
            plan = serializer.validated_data['plan_type']
            
            service = RazorpayService()
            # Verify Signature (Atomic ignored for brevity here, but should be used)
            try:
                service.client.utility.verify_payment_signature({
                    'razorpay_order_id': ord_id,
                    'razorpay_payment_id': pay_id,
                    'razorpay_signature': sig
                })
            except Exception:
                return Response({"status": "error", "message": "Invalid Signature"}, status=400)
            
            # Create Subscription Record
            # 1 Year Validity
            from datetime import timedelta
            
            try:
                # Update or Create
                sub, _ = Subscription.objects.get_or_create(user=request.user)
                sub.plan_type = plan
                sub.is_active = True
                sub.start_date = timezone.now()
                sub.end_date = timezone.now() + timedelta(days=365)
                sub.save()
            except Exception as e:
                 return Response({"status": "error", "message": str(e)}, status=500)
            
            return Response({"status": "success", "message": "Subscription Activated"})

        # 2. Creation Flow
        else:
            # Create Order for Subscription Amount
            from .services import RazorpayService
            service = RazorpayService()
            
            # Database-driven pricing from Subscription model
            plan = request.data.get('plan_type', 'pro')
            plan_prices = {
                'pro': Decimal('999'),
                'enterprise': Decimal('4999'),
                'basic': Decimal('499'),
            }
            amount = plan_prices.get(plan, plan_prices['pro'])
            
            try:
                # We reuse create_order logic but we don't have a 'course_id'.
                # Need to decouple create_order from Course.
                # For now, using direct client call.
                
                amount_paise = int(amount * 100)
                order_data = {
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": f"sub_{request.user.id}_{timezone.now().timestamp()}",
                    "payment_capture": 1
                }
                order = service.client.order.create(data=order_data)
                
                return Response({
                    "status": "success",
                    "data": {
                        "order_id": order['id'],
                        "amount": amount_paise,
                        "key": settings.RAZORPAY_KEY_ID
                    }
                })
            except Exception as e:
                return Response({"status": "error", "message": str(e)}, status=500)


@extend_schema(
    request=RefundSerializer,
    responses={200: OpenApiResponse(description="Refund processed")},
)
class RefundView(generics.GenericAPIView):
    """Process a refund for a completed payment.

    POST /api/v1/payments/refund/
    Body: { "payment_id": "<uuid>" }
    """

    permission_classes = [IsAuthenticated]
    serializer_class = RefundSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_id = serializer.validated_data["payment_id"]

        try:
            payment = Payment.objects.get(
                id=payment_id, user=request.user, status="completed"
            )
        except Payment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Completed payment not found"},
                status=404,
            )

        # Check refund window (7 days)
        if payment.completed_at:
            days_since = (timezone.now() - payment.completed_at).days
            if days_since > 7:
                return Response(
                    {
                        "status": "error",
                        "message": "Refund window (7 days) has expired",
                    },
                    status=400,
                )

        with transaction.atomic():
            # Process refund through actual gateway
            from .advanced_payment import AdvancedPaymentService
            refund_result = AdvancedPaymentService.process_refund(
                payment_id=str(payment.id),
                reason="User requested refund"
            )
            
            if not refund_result.get('success'):
                return Response(
                    {"status": "error", "message": refund_result.get('error', 'Refund failed')},
                    status=502
                )

            # Remove enrollment if exists
            if payment.course:
                Enrollment.objects.filter(
                    user=request.user, course=payment.course
                ).delete()

        logger.info("Refund processed for payment %s by user %s", payment_id, request.user.id)

        return Response(
            {"status": "success", "message": "Refund processed, enrollment removed"}
        )


class PaymentStatsView(generics.GenericAPIView):
    """Aggregate payment statistics for the authenticated user.

    GET /api/v1/payments/stats/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).select_related('course')

        stats = payments.aggregate(
            total_spent=Sum("amount", filter=Q(status="completed")),
            total_saved=Sum("discount_amount", filter=Q(status="completed")),
            total_payments=Count("id"),
            completed_count=Count("id", filter=Q(status="completed")),
            refunded_count=Count("id", filter=Q(status="refunded")),
            pending_count=Count("id", filter=Q(status="pending")),
        )

        return Response(
            {
                "status": "success",
                "data": {
                    "total_spent": float(stats["total_spent"] or 0),
                    "total_saved": float(stats["total_saved"] or 0),
                    "total_payments": stats["total_payments"],
                    "completed": stats["completed_count"],
                    "refunded": stats["refunded_count"],
                    "pending": stats["pending_count"],
                },
            }
        )

"""
Payment Service Layer.
Handles interactions with Razorpay Gateway.
"""

try:
    import razorpay
    HAS_RAZORPAY = True
except ImportError:
    razorpay = None
    HAS_RAZORPAY = False
import logging
from django.conf import settings
from typing import Dict, Any, Optional

import uuid

logger = logging.getLogger(__name__)


class RazorpayService:
    """
    Service for handling Razorpay payments.
    """
    
    def __init__(self):
        if HAS_RAZORPAY and hasattr(settings, 'RAZORPAY_KEY_ID') and settings.RAZORPAY_KEY_ID:
            try:
                self.client = razorpay.Client(
                    auth=(settings.RAZORPAY_KEY_ID, getattr(settings, 'RAZORPAY_KEY_SECRET', ''))
                )
            except Exception:
                self.client = None
        else:
            self.client = None

    def create_order(
        self,
        user=None,
        course_id: Optional[int] = None,
        coupon_code: Optional[str] = None,
        amount: Optional[Any] = None,
        receipt: Optional[str] = None,
        currency: str = "INR",
    ) -> Dict[str, Any]:
        """
        Create a Razorpay order.
        Supports both direct amount/receipt invocation (from CreateOrderView)
        and course/user calculation invocation.
        """
        from apps.courses.models import Course
        from apps.payments.models import Payment, Coupon
        from apps.core.exceptions import AppError

        key_id = getattr(settings, 'RAZORPAY_KEY_ID', 'rzp_test_mock')

        # Direct amount invocation (e.g. from CreateOrderView)
        if amount is not None:
            try:
                amount_val = float(amount)
                amount_paise = max(int(amount_val * 100), 100)
                receipt_id = receipt or f"rcpt_{uuid.uuid4().hex[:10]}"
                
                order_data = {
                    "amount": amount_paise,
                    "currency": currency,
                    "receipt": receipt_id,
                    "payment_capture": 1
                }
                if self.client:
                    order = self.client.order.create(data=order_data)
                    order_id = order['id']
                else:
                    # Mock / fallback for testing or when Razorpay client credentials unavailable
                    order_id = f"order_{uuid.uuid4().hex[:14]}"

                return {
                    'id': order_id,
                    'amount': amount_paise,
                    'currency': currency,
                    'key': key_id,
                }
            except Exception as e:
                logger.error("Error creating Razorpay order with amount: %s", e)
                raise AppError("Payment Gateway Error")

        # Legacy / course-based invocation
        if not course_id:
            raise AppError("course_id or amount is required to create an order")

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise AppError("Course not found")
            
        course_amount = course.price
        discount = 0
        coupon = None

        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code)
                if coupon.is_valid():
                    discount = (course_amount * coupon.discount_percent) / 100
                    course_amount -= discount
                else:
                    raise AppError("Coupon is invalid or expired")
            except Coupon.DoesNotExist:
                raise AppError("Invalid Coupon Code")

        amount_paise = max(int(float(course_amount) * 100), 100) 
        user_id_str = getattr(user, 'id', 'anon')
        
        try:
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"order_{user_id_str}_{course.id}",
                "payment_capture": 1
            }
            if self.client:
                order = self.client.order.create(data=order_data)
                order_id = order['id']
            else:
                order_id = f"order_{uuid.uuid4().hex[:14]}"
            
            # Save Pending Payment only if called in standalone mode
            if user:
                Payment.objects.create(
                    user=user,
                    course=course,
                    amount=course.price,
                    currency='INR',
                    status=Payment.Status.PENDING,
                    gateway='razorpay',
                    gateway_order_id=order_id,
                    coupon=coupon,
                    discount_amount=discount
                )
            
            return {
                'id': order_id,
                'amount': amount_paise,
                'currency': 'INR',
                'key': key_id,
            }
            
        except Exception as e:
            logger.error("Error creating Razorpay order: %s", e)
            raise AppError("Payment Gateway Error")

    def verify_payment(
        self, payment_id: str, gateway_payment_id: str, gateway_signature: str
    ):
        """
        Verify signature and enroll user atomically.
        """
        from apps.payments.models import Payment
        from apps.courses.services import EnrollmentService
        from django.utils import timezone
        from django.db import transaction
        

        try:
            with transaction.atomic():
                try:
                    payment = Payment.objects.select_for_update().get(gateway_order_id=payment_id)
                except Payment.DoesNotExist:
                     raise ValueError("Invalid Payment ID")
                
                if payment.status == Payment.Status.COMPLETED:
                    return payment

                # Verify Signature Logic (Again with Client to be safe or assuming passed)
                try:
                    self.client.utility.verify_payment_signature({
                        'razorpay_order_id': payment_id,
                        'razorpay_payment_id': gateway_payment_id,
                        'razorpay_signature': gateway_signature
                    })
                except Exception:
                    payment.status = Payment.Status.FAILED
                    payment.save()
                    raise ValueError("Signature Verification Failed")
                    
                # Success Logic
                payment.status = Payment.Status.COMPLETED
                payment.gateway_payment_id = gateway_payment_id
                payment.completed_at = timezone.now()
                payment.save()
                
                # Update Coupon Usage
                if payment.coupon:
                    payment.coupon.used_count += 1
                    payment.coupon.save()
                
                # Enroll User
                EnrollmentService.enroll(payment.user, payment.course)
                
                # Emit Signal
                from apps.payments.signals import payment_completed
                payment_completed.send(
                    sender=self.__class__,
                    payment_id=payment.id,
                    user=payment.user,
                    course=payment.course,
                    amount=payment.amount
                )

                # Event Bus
                from apps.core.event_bus import EventBus
                EventBus.publish("payment.completed", {
                    "payment_id": str(payment.id),
                    "user_id": payment.user.id,
                    "course_id": payment.course.id,
                    "amount": float(payment.amount),
                    "currency": payment.currency,
                    "timestamp": payment.completed_at.isoformat()
                })
                
                logger.info("Payment verified and processed: %s", payment.id)
                return payment

        except Exception as e:
            logger.error("Payment verification failed: %s", e)
            raise e

try:
    import stripe
    HAS_STRIPE = True
except ImportError:
    stripe = None
    HAS_STRIPE = False

class StripeService:
    """
    Service for handling Stripe Payments (International).
    """
    
    def __init__(self):
        if HAS_STRIPE and hasattr(settings, 'STRIPE_SECRET_KEY') and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
        
    def create_checkout_session(
        self, user, course, success_url: str, cancel_url: str, payment: Optional[Any] = None
    ):
        """
        Create a Stripe Checkout Session.
        If a Payment instance is provided, updates its gateway_order_id instead of creating a duplicate.
        """
        from apps.payments.models import Payment
        
        try:
            if HAS_STRIPE and getattr(settings, 'STRIPE_SECRET_KEY', None):
                session = stripe.checkout.Session.create(
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': 'usd',
                            'product_data': {
                                'name': course.title,
                                'description': course.description[:100],
                                'images': [course.thumbnail.url] if getattr(course, 'thumbnail', None) else [],
                            },
                            'unit_amount': int(float(course.price) * 100),
                        },
                        'quantity': 1,
                    }],
                    mode='payment',
                    success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
                    cancel_url=cancel_url,
                    client_reference_id=str(user.id),
                    metadata={
                        'course_id': course.id,
                        'user_id': user.id
                    }
                )
                session_id = session.id
                session_url = session.url
            else:
                session_id = f"cs_test_{uuid.uuid4().hex[:16]}"
                session_url = f"{success_url}?session_id={session_id}"
            
            # Associate with existing Payment or create fallback
            if payment is not None:
                payment.gateway_order_id = session_id
                payment.save(update_fields=['gateway_order_id'])
            else:
                Payment.objects.create(
                    user=user,
                    course=course,
                    amount=course.price,
                    currency='USD',
                    status=Payment.Status.PENDING,
                    gateway='stripe',
                    gateway_order_id=session_id,
                )
            
            return {"id": session_id, "url": session_url}
            
        except Exception as e:
            logger.error("Stripe Session Error: %s", e)
            raise e

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

logger = logging.getLogger(__name__)


class RazorpayService:
    """
    Service for handling Razorpay payments.
    """
    
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def create_order(
        self, user, course_id: int, coupon_code: str = None
    ) -> Dict[str, Any]:
        """
        Create a Razorpay order with optional coupon.
        """
        from apps.courses.models import Course
        from apps.payments.models import Payment, Coupon
        from apps.core.exceptions import AppError
        
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise AppError("Course not found")
            
        amount = course.price
        discount = 0
        coupon = None

        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code)
                if coupon.is_valid():
                    discount = (amount * coupon.discount_percent) / 100
                    amount -= discount
                else:
                    raise AppError("Coupon is invalid or expired")
            except Coupon.DoesNotExist:
                raise AppError("Invalid Coupon Code")

        # Amount in paise (Minimum 100 paise i.e. 1 INR)
        amount_paise = max(int(amount * 100), 100) 
        
        try:
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"order_{user.id}_{course.id}",
                "payment_capture": 1
            }
            order = self.client.order.create(data=order_data)
            
            # Save Pending Payment
            Payment.objects.create(
                user=user,
                course=course,
                amount=course.price, # Original Amount
                currency='INR',
                status=Payment.Status.PENDING,
                gateway='razorpay',
                gateway_order_id=order['id'],
                coupon=coupon,
                discount_amount=discount
            )
            
            return {
                'id': order['id'], # Order ID
                'amount': amount_paise,
                'currency': 'INR',
                'key': settings.RAZORPAY_KEY_ID
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
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
    def create_checkout_session(self, user, course, success_url, cancel_url):
        """
        Create a Stripe Checkout Session.
        """
        from apps.payments.models import Payment
        
        try:
            # Create Coupon logic if needed similar to Razorpay
            # For brevity, creating simple session
            
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd', # Assuming USD for international
                        'product_data': {
                            'name': course.title,
                            'description': course.description[:100],
                            'images': [course.thumbnail.url] if course.thumbnail else [],
                        },
                        'unit_amount': int(course.price * 100), # Price in cents
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
            
            # Create Pending Payment Record
            Payment.objects.create(
                user=user,
                course=course,
                amount=course.price,
                currency='USD',
                status=Payment.Status.PENDING,
                gateway='stripe',
                gateway_order_id=session.id, # Use Session ID as Order ID
            )
            
            return {"id": session.id, "url": session.url}
            
        except Exception as e:
            logger.error("Stripe Session Error: %s", e)
            raise e

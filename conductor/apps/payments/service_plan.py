
import razorpay
from django.conf import settings
from .models import Payment, Coupon
from apps.courses.models import Course
from django.utils import timezone
from apps.core.exceptions import AppError

class PaymentService:
    @staticmethod
    def get_client():
        return razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    @staticmethod
    def create_order(user, course_id, coupon_code=None):
        course = Course.objects.get(id=course_id)
        amount = course.price
        discount = 0
        coupon = None

        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code)
                if coupon.is_valid():
                    discount = (amount * coupon.discount_percent) / 100
                    amount -= discount
            except Coupon.DoesNotExist:
                raise AppError("Invalid Coupon Code")

        # Amount in paise
        amount_paise = int(amount * 100)
        
        client = PaymentService.get_client()
        order_data = {
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': f'order_{user.id}_{course.id}',
            'payment_capture': 1 
        }
        
        razorpay_order = client.order.create(data=order_data)
        
        # Save pending payment
        payment = Payment.objects.create(
            user=user,
            course=course,
            amount=amount,
            currency='INR',
            status=Payment.Status.PENDING,
            gateway='razorpay',
            gateway_order_id=razorpay_order['id'],
            coupon=coupon,
            discount_amount=discount
        )
        
        return {
            'order_id': razorpay_order['id'],
            'amount': amount,
            'key': settings.RAZORPAY_KEY_ID,
            'payment_id': payment.id
        }

    @staticmethod
    def verify_payment(payment_id, gateway_payment_id, gateway_signature):
        payment = Payment.objects.get(id=payment_id)
        
        client = PaymentService.get_client()
        
        # Verify Signature
        params_dict = {
            'razorpay_order_id': payment.gateway_order_id,
            'razorpay_payment_id': gateway_payment_id,
            'razorpay_signature': gateway_signature
        }
        
        try:
            client.utility.verify_payment_signature(params_dict)
        except Exception:
            payment.status = Payment.Status.FAILED
            payment.save()
            raise AppError("Payment Verification Failed")
            
        # Success
        payment.status = Payment.Status.COMPLETED
        payment.gateway_payment_id = gateway_payment_id
        payment.completed_at = timezone.now()
        payment.save()
        
        # Enroll Code (EnrollmentService.enroll(user, course))
        from apps.courses.services import EnrollmentService
        EnrollmentService.enroll(payment.user, payment.course)
        
        return payment

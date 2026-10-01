"""
Stripe Payment Service for LearningHub
Handles all Stripe API interactions securely.
"""
import os
import uuid
import stripe
from decimal import Decimal
from typing import Optional, Dict, Any, List
from django.conf import settings
from django.utils import timezone
from django.utils import timezone as django_timezone

# Configure Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')


class StripeService:
    """Stripe payment service for LearningHub."""

    @staticmethod
    def create_customer(user, email: str = None) -> Dict[str, Any]:
        """Create or retrieve Stripe customer for user."""
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=email or user.email,
                name=user.get_full_name() or user.username,
                metadata={
                    'user_id': str(user.id),
                    'username': user.username,
                }
            )
            user.stripe_customer_id = customer.id
            user.save(update_fields=['stripe_customer_id'])
            return {'customer': customer, 'created': True}
        else:
            return {'customer': stripe.Customer.retrieve(user.stripe_customer_id), 'created': False}

    @staticmethod
    def create_checkout_session(
        user,
        items: List[Dict],
        success_url: str,
        cancel_url: str,
        idempotency_key: str,
        trial_days: int = 0,
        subscription_mode: str = 'payment'
    ) -> Dict[str, Any]:
        """
        Create Stripe Checkout Session.

        Args:
            user: Django user
            items: List of {'price_id': str, 'quantity': int} or {'price_data': {...}, 'quantity': int}
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel
            idempotency_key: Unique key for idempotency
            trial_days: Trial period days for subscriptions
            subscription_mode: 'payment' (one-time) or 'subscription'
        """
        customer_data = StripeService.create_customer(user)

        line_items = []
        for item in items:
            if 'price_id' in item:
                line_items.append({
                    'price': item['price_id'],
                    'quantity': item.get('quantity', 1),
                })
            elif 'price_data' in item:
                line_items.append({
                    'price_data': item['price_data'],
                    'quantity': item.get('quantity', 1),
                })

        session_params = {
            'customer': customer_data['customer'].id,
            'line_items': line_items,
            'mode': subscription_mode,
            'success_url': success_url,
            'cancel_url': cancel_url,
            'idempotency_key': idempotency_key,
            'metadata': {
                'user_id': str(user.id),
            },
            'allow_promotion_codes': True,
            'billing_address_collection': 'required',
        }

        if subscription_mode == 'subscription':
            if trial_days > 0:
                session_params['subscription_data'] = {'trial_period_days': trial_days}
            session_params['subscription_data'] = session_params.get('subscription_data', {})
            session_params['subscription_data']['metadata'] = {'user_id': str(user.id)}

        session = stripe.checkout.Session.create(**session_params, idempotency_key=idempotency_key)
        return {'session': session, 'url': session.url}

    @staticmethod
    def create_subscription(
        user,
        price_id: str,
        trial_days: int = 0,
        payment_method_id: str = None,
        idempotency_key: str = None
    ) -> Dict[str, Any]:
        """Create a subscription for a customer."""
        customer_data = StripeService.create_customer(user)

        subscription = stripe.Subscription.create(
            customer=customer_data['customer'].id,
            items=[{'price': price_id}],
            trial_period_days=trial_days if trial_days > 0 else None,
            default_payment_method=payment_method_id,
            expand=['latest_invoice.payment_intent'],
            idempotency_key=idempotency_key,
        )
        return {'subscription': subscription}

    @staticmethod
    def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> Dict[str, Any]:
        """Cancel a subscription."""
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=at_period_end,
        )
        if not at_period_end:
            stripe.Subscription.delete(subscription_id)
        return {'subscription': subscription, 'canceled': True}

    @staticmethod
    def resume_subscription(subscription_id: str) -> Dict[str, Any]:
        """Resume a canceled subscription."""
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=False,
        )
        return {'subscription': subscription}

    @staticmethod
    def update_subscription(
        subscription_id: str,
        price_id: str = None,
        proration_behavior: str = 'create_prorations',
        idempotency_key: str = None
    ) -> Dict[str, Any]:
        """Upgrade/downgrade subscription."""
        if price_id:
            subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{'id': subscription_id, 'price': price_id}],
                proration_behavior=proration_behavior,
                idempotency_key=idempotency_key,
            )
        else:
            subscription = stripe.Subscription.retrieve(subscription_id)
        return {'subscription': subscription}

    @staticmethod
    def create_portal_session(customer_id: str, return_url: str) -> str:
        """Create Stripe Billing Portal session."""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session.url

    @staticmethod
    def get_payment_methods(customer_id: str, type: str = 'card') -> List[Dict]:
        """Get customer's payment methods."""
        methods = stripe.PaymentMethod.list(
            customer=customer_id,
            type=type,
        )
        return methods.data

    @staticmethod
    def detach_payment_method(payment_method_id: str) -> bool:
        """Detach payment method from customer."""
        stripe.PaymentMethod.detach(payment_method_id)
        return True

    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """Verify and construct webhook event."""
        return stripe.Webhook.construct_event(
            payload, os.environ.get('STRIPE_WEBHOOK_SECRET', ''), sig_header
        )

    @staticmethod
    def get_subscription(subscription_id: str) -> Dict:
        """Retrieve subscription details."""
        return stripe.Subscription.retrieve(subscription_id)

    @staticmethod
    def get_invoice(invoice_id: str) -> Dict:
        """Retrieve invoice details."""
        return stripe.Invoice.retrieve(invoice_id)

    @staticmethod
    def list_prices(lookup_keys: List[str] = None, active: bool = True) -> List[Dict]:
        """List prices, optionally filtered by lookup keys."""
        params = {'active': active, 'limit': 100}
        if lookup_keys:
            params['lookup_keys'] = lookup_keys
        prices = stripe.Price.list(**params)
        return prices.data


# Convenience functions for common operations
def create_course_checkout(user, course, success_url: str, cancel_url: str, idempotency_key: str) -> Dict:
    """Create checkout session for a single course purchase."""
    from apps.courses.models import Course
    course_obj = course if isinstance(course, object) and hasattr(course, 'price') else None
    # This would be called with a Course object
    return StripeService.create_checkout_session(
        user=user,
        items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {'name': course.title if hasattr(course, 'title') else 'Course'},
                'unit_amount': int(course.price * 100) if hasattr(course, 'price') else 0,
            },
            'quantity': 1,
        }],
        success_url=f"{cancel_url}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=cancel_url,
        idempotency_key=idempotency_key,
        subscription_mode='payment',
    )


def create_subscription_checkout(user, price_id: str, success_url: str, cancel_url: str, trial_days: int = 14) -> Dict:
    """Create checkout for subscription."""
    return StripeService.create_checkout_session(
        user=user,
        items=[{'price_id': price_id, 'quantity': 1}],
        success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=cancel_url,
        idempotency_key=f"sub_{uuid.uuid4().hex[:12]}",
        trial_days=14,
        subscription_mode='subscription',
    )
import json
import time
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import stripe
from django.urls import reverse
from rest_framework.test import APIClient

from apps.courses.models import Course, Enrollment
from apps.ecommerce.models import Order, OrderItem, PaymentTransaction
from apps.ecommerce.stripe_service import StripeService
from apps.users.models import User


@pytest.mark.django_db
class TestStripeCheckoutWebhook:
    webhook_secret = 'whsec_ecommerce_test_secret'

    def setup_method(self):
        self.user = User.objects.create_user(
            email='stripe-shopper@learninghub.app',
            username='StripeShopper',
            password='Password123!',
        )
        self.course = Course.objects.create(
            id='crs-stripe-checkout',
            title='Stripe Checkout Course',
            slug='stripe-checkout-course',
            description='Course for Stripe checkout tests',
            price=150.00,
        )
        self.order = Order.objects.create(
            user=self.user,
            total_amount='150.00',
            subtotal_amount='150.00',
            status='PENDING',
            payment_method='STRIPE',
            metadata={'stripe_customer_id': 'cus_ecommerce_test'},
        )
        OrderItem.objects.create(order=self.order, course=self.course, price='150.00')
        self.payment = PaymentTransaction.objects.create(
            order=self.order,
            amount='150.00',
            currency='INR',
            status='PENDING',
        )
        self.client = APIClient()

    def checkout_session(self):
        return {
            'id': 'cs_test_ecommerce_order',
            'object': 'checkout.session',
            'client_reference_id': self.order.id,
            'metadata': {
                'order_id': self.order.id,
                'user_id': str(self.user.id),
            },
            'customer': 'cus_ecommerce_test',
            'mode': 'payment',
            'status': 'complete',
            'payment_status': 'paid',
            'amount_total': 15000,
            'currency': 'inr',
            'payment_intent': 'pi_test_ecommerce_payment',
        }

    def signed_payload(self, session=None, event_type='checkout.session.completed'):
        event = {
            'id': 'evt_test_ecommerce_checkout',
            'object': 'event',
            'type': event_type,
            'data': {'object': session or self.checkout_session()},
        }
        payload = json.dumps(event, separators=(',', ':')).encode()
        timestamp = int(time.time())
        signature = stripe.WebhookSignature.generate_signature_header(
            payload.decode(), self.webhook_secret, timestamp=timestamp
        )
        return payload, signature

    def send_webhook(self, payload, signature):
        return self.client.post(
            reverse('stripe-webhook'),
            data=payload,
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE=signature,
        )

    def map_order_to_checkout(self):
        self.order.gateway_order_id = 'cs_test_ecommerce_order'
        self.order.payment_method = 'STRIPE'
        self.order.save(update_fields=['gateway_order_id', 'payment_method'])

    def test_verified_checkout_completion_pays_and_enrolls_transactionally(self):
        self.map_order_to_checkout()
        payload, signature = self.signed_payload()

        with patch.dict('os.environ', {'STRIPE_WEBHOOK_SECRET': self.webhook_secret}):
            response = self.send_webhook(payload, signature)

        assert response.status_code == 200, response.data
        self.order.refresh_from_db()
        self.payment.refresh_from_db()
        assert self.order.status == 'COMPLETED'
        assert self.order.gateway_payment_id == 'pi_test_ecommerce_payment'
        assert self.order.paid_at is not None
        assert self.order.webhook_received_at is not None
        assert self.payment.status == 'SUCCESS'
        assert self.payment.gateway_reference == 'pi_test_ecommerce_payment'
        assert Enrollment.objects.filter(user=self.user, course=self.course).count() == 1

    def test_invalid_stripe_signature_does_not_complete_order(self):
        self.map_order_to_checkout()
        payload, _ = self.signed_payload()

        with patch.dict('os.environ', {'STRIPE_WEBHOOK_SECRET': self.webhook_secret}):
            response = self.send_webhook(payload, 't=1,v1=invalid')

        assert response.status_code == 400
        self.order.refresh_from_db()
        assert self.order.status == 'PENDING'
        assert not Enrollment.objects.filter(user=self.user, course=self.course).exists()

    def test_replayed_checkout_event_is_idempotent(self):
        self.map_order_to_checkout()
        payload, signature = self.signed_payload()

        with patch.dict('os.environ', {'STRIPE_WEBHOOK_SECRET': self.webhook_secret}):
            first = self.send_webhook(payload, signature)
            replay = self.send_webhook(payload, signature)

        assert first.status_code == 200, first.data
        assert replay.status_code == 200, replay.data
        assert replay.data['data']['already_processed'] is True
        assert Enrollment.objects.filter(user=self.user, course=self.course).count() == 1
        assert PaymentTransaction.objects.filter(order=self.order).count() == 1

    def test_stripe_checkout_session_maps_to_authenticated_pending_order(self):
        self.client.force_authenticate(user=self.user)
        session = SimpleNamespace(
            id='cs_test_ecommerce_order',
            url='https://checkout.stripe.test/session',
            customer='cus_ecommerce_test',
        )

        with (
            patch.dict('os.environ', {'STRIPE_SECRET_KEY': 'sk_test_ecommerce'}),
            patch.object(StripeService, 'create_customer', return_value={
                'customer': SimpleNamespace(id='cus_ecommerce_test'),
            }),
            patch('apps.ecommerce.stripe_service.stripe.checkout.Session.create', return_value=session) as create_session,
        ):
            response = self.client.post(
                reverse('stripe-checkout'),
                {
                    'order_id': self.order.id,
                    'success_url': 'https://learninghub.test/success',
                    'cancel_url': 'https://learninghub.test/cancel',
                    'items': [{'price_data': {'unit_amount': 1}}],
                },
                format='json',
            )

        assert response.status_code == 200, response.data
        assert response.data['data']['order_id'] == self.order.id
        self.order.refresh_from_db()
        assert self.order.status == 'PENDING'
        assert self.order.gateway_order_id == session.id
        assert self.order.payment_method == 'STRIPE'

        stripe_params = create_session.call_args.kwargs
        assert stripe_params['client_reference_id'] == self.order.id
        assert stripe_params['metadata']['order_id'] == self.order.id
        assert stripe_params['metadata']['user_id'] == str(self.user.id)
        assert stripe_params['line_items'][0]['price_data']['currency'] == 'inr'
        assert stripe_params['line_items'][0]['price_data']['unit_amount'] == 15000

    def test_expired_checkout_session_is_recreated_for_the_same_order(self):
        self.order.gateway_order_id = 'cs_test_expired_order'
        self.order.payment_method = 'STRIPE'
        self.order.save(update_fields=['gateway_order_id', 'payment_method'])
        replacement = SimpleNamespace(
            id='cs_test_replacement_order',
            url='https://checkout.stripe.test/replacement',
            customer='cus_ecommerce_test',
        )
        self.client.force_authenticate(user=self.user)

        with (
            patch.object(
                StripeService,
                'retrieve_checkout_session',
                return_value=SimpleNamespace(status='expired'),
            ),
            patch.object(
                StripeService,
                'create_checkout_session',
                return_value={
                    'session': replacement,
                    'url': replacement.url,
                    'customer_id': 'cus_ecommerce_test',
                },
            ) as create_session,
        ):
            response = self.client.post(
                reverse('stripe-checkout'),
                {
                    'order_id': self.order.id,
                    'success_url': 'https://learninghub.test/success',
                    'cancel_url': 'https://learninghub.test/cancel',
                },
                format='json',
            )

        assert response.status_code == 200, response.data
        assert response.data['data']['session_id'] == replacement.id
        assert create_session.call_args.kwargs['idempotency_key'] == (
            f'stripe-order-{self.order.id}-after-cs_test_expired_order'
        )
        self.order.refresh_from_db()
        assert self.order.gateway_order_id == replacement.id

    def test_async_payment_success_event_completes_the_order(self):
        self.map_order_to_checkout()
        payload, signature = self.signed_payload(
            event_type='checkout.session.async_payment_succeeded',
        )

        with patch.dict('os.environ', {'STRIPE_WEBHOOK_SECRET': self.webhook_secret}):
            response = self.send_webhook(payload, signature)

        assert response.status_code == 200, response.data
        self.order.refresh_from_db()
        assert self.order.status == 'COMPLETED'
        assert Enrollment.objects.filter(user=self.user, course=self.course).count() == 1

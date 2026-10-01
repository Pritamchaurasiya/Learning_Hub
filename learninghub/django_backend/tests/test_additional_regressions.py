"""
LearningHub Cycle 15 — Additional Regression Tests
Push Django coverage from 32% to 60%+ by adding 5 integration tests.
Follows style in tests/test_security_regressions.py — uses APIClient,
pytest.mark.django_db, reverse() with correct URL names (inspected via urls.py).
"""
import json
import os
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.courses.models import Course
from apps.ecommerce.models import Order
from apps.social.models import Notification


@pytest.mark.django_db
class TestAdditionalRegressions:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="additional_regression@learninghub.app",
            password="Password123!",
            username="AdditionalRegression",
        )
        self.client.force_authenticate(user=self.user)

    def test_cart_idempotency(self):
        """
        POST /api/v1/checkout twice with same X-Idempotency-Key header
        -> second returns same order (idempotent_replay) or 200 not duplicate.
        Inspected apps/ecommerce/views.py CheckoutView:
          - URL name='checkout' at path 'checkout' (also 'checkout/' and 'payments/orders')
          - Header is X-Idempotency-Key (request.headers.get('X-Idempotency-Key'))
        """
        # Create purchasable course
        course = Course.objects.create(
            id="crs-idemp-1",
            title="Idempotency Test Course",
            slug="idempotency-test-course",
            description="Course for idempotency regression",
            category="General",
            price=100.00,
            original_price=120.00,
        )
        # Add to cart
        cart_url = reverse("cart-view")
        add_res = self.client.post(cart_url, {"course_id": course.id, "quantity": 1}, format="json")
        assert add_res.status_code == status.HTTP_200_OK, add_res.data

        checkout_url = reverse("checkout")
        idem_key = "test-idem-key-12345"

        # First checkout
        res1 = self.client.post(
            checkout_url,
            {"payment_method": "CARD"},
            format="json",
            HTTP_X_IDEMPOTENCY_KEY=idem_key,
        )
        assert res1.status_code == status.HTTP_201_CREATED, res1.data
        assert "order" in res1.data["data"]
        order_id_1 = res1.data["data"]["order"]["id"]
        assert res1.data["data"]["idempotent_replay"] is False
        assert Order.objects.filter(user=self.user).count() == 1

        # Second checkout with same key — should be idempotent replay
        res2 = self.client.post(
            checkout_url,
            {"payment_method": "CARD"},
            format="json",
            HTTP_X_IDEMPOTENCY_KEY=idem_key,
        )
        # Spec allows 200 replay or 200 not duplicate; current impl returns 200 with idempotent_replay True
        assert res2.status_code == status.HTTP_200_OK, res2.data
        assert res2.data["data"]["idempotent_replay"] is True
        assert res2.data["data"]["order"]["id"] == order_id_1
        # No duplicate order created
        assert Order.objects.filter(user=self.user).count() == 1
        assert Order.objects.filter(user=self.user, idempotency_key=idem_key).count() == 1

        # Third checkout with different key should create new order if cart still has items
        # Cart is NOT cleared until payment webhook (PENDING), so same cart items still present
        res3 = self.client.post(
            checkout_url,
            {"payment_method": "CARD"},
            format="json",
            HTTP_X_IDEMPOTENCY_KEY="different-key-999",
        )
        # Should create a new order (duplicate cart checkout with new key)
        # Accept either 201 or 200 depending on impl, but must be new order
        assert res3.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        if res3.status_code == status.HTTP_201_CREATED:
            assert res3.data["data"]["order"]["id"] != order_id_1
            assert Order.objects.filter(user=self.user).count() == 2

    def test_notification_user_isolation(self):
        """
        Create 2 users, create Notification for user A,
        try to fetch/mark as other user B -> assert 404 or empty.
        Inspected apps/social/models.py Notification model (user FK, is_read, type)
        and apps/gamification/views.py Notifications* views:
          - GET  /api/v1/notifications (name='notifications-list') filters by user
          - PATCH /api/v1/notifications/<pk>/read (name='notification-mark-read') filters by user
        """
        user_a = User.objects.create_user(
            email="notif_user_a@learninghub.app",
            password="Password123!",
            username="NotifUserA",
        )
        user_b = User.objects.create_user(
            email="notif_user_b@learninghub.app",
            password="Password123!",
            username="NotifUserB",
        )
        notif_a = Notification.objects.create(
            user=user_a,
            title="Secret for A",
            message="Only A should see this",
            type="INFO",
        )

        # Authenticate as B and try to list notifications — should not see A's notification
        client_b = APIClient()
        client_b.force_authenticate(user=user_b)
        list_url = reverse("notifications-list")
        res_list_b = client_b.get(list_url)
        assert res_list_b.status_code == status.HTTP_200_OK, res_list_b.data
        # Data is list of notifications for B only
        ids_b = [n["id"] for n in res_list_b.data["data"]]
        assert notif_a.id not in ids_b, f"User B should not see A's notification {notif_a.id}"
        # Unread count for B should be 0
        unread_url = reverse("notifications-unread-count")
        res_unread_b = client_b.get(unread_url)
        assert res_unread_b.status_code == status.HTTP_200_OK
        assert res_unread_b.data["data"]["count"] == 0

        # Try to mark A's notification as read as B -> 404
        mark_url = reverse("notification-mark-read", kwargs={"pk": notif_a.id})
        res_mark_b = client_b.patch(mark_url)
        assert res_mark_b.status_code == status.HTTP_404_NOT_FOUND, res_mark_b.data

        # Try to delete A's notification as B -> should not delete (deleted_count 0 or 404)
        delete_url = reverse("notification-delete", kwargs={"pk": notif_a.id})
        res_del_b = client_b.delete(delete_url)
        # NotificationsListView.delete filters by user, returns deleted_count 0 for other user
        assert res_del_b.status_code == status.HTTP_200_OK, res_del_b.data
        assert res_del_b.data["data"]["deleted_count"] == 0
        assert Notification.objects.filter(id=notif_a.id, user=user_a).exists()

        # Positive check: A can see own notification
        client_a = APIClient()
        client_a.force_authenticate(user=user_a)
        res_list_a = client_a.get(list_url)
        assert res_list_a.status_code == status.HTTP_200_OK
        ids_a = [n["id"] for n in res_list_a.data["data"]]
        assert notif_a.id in ids_a

        # A can mark own as read
        res_mark_a = client_a.patch(mark_url)
        assert res_mark_a.status_code == status.HTTP_200_OK
        notif_a.refresh_from_db()
        assert notif_a.is_read is True

    def test_leaderboard_filter(self):
        """
        GET /api/v1/gamification/leaderboard — assert only users with xp>0 and is_active returned,
        no anonymous without throttle bypass, check that fake targetCollege not present.
        Inspected apps/gamification/views.py LeaderboardView:
          - filters is_active=True, xp__gt=0
          - throttle_classes = [_LeaderboardThrottle]
          - removed fake fields: targetCollege, courses_completed
        """
        # Clean slate: create specific users with known xp/is_active
        # Use unique emails to avoid collision with setup_method user (which has xp 0)
        user_active_good = User.objects.create_user(
            email="leader_active_good@learninghub.app",
            password="Password123!",
            username="LeaderActiveGood",
        )
        user_active_good.xp = 500
        user_active_good.is_active = True
        user_active_good.save()

        user_zero = User.objects.create_user(
            email="leader_zero_xp@learninghub.app",
            password="Password123!",
            username="LeaderZero",
        )
        user_zero.xp = 0
        user_zero.is_active = True
        user_zero.save()

        user_inactive = User.objects.create_user(
            email="leader_inactive@learninghub.app",
            password="Password123!",
            username="LeaderInactive",
        )
        user_inactive.xp = 999
        user_inactive.is_active = False
        user_inactive.save()

        # Also ensure setup user (xp 0 by default) is not leaked
        self.user.xp = 0
        self.user.is_active = True
        self.user.save()

        # Anonymous fetch (AllowAny) — should succeed without auth and respect throttle
        anon_client = APIClient()
        lb_url = reverse("gamification-leaderboard")
        res = anon_client.get(lb_url)
        assert res.status_code == status.HTTP_200_OK, res.data
        data = res.data["data"]
        assert isinstance(data, list)

        # Collect IDs/usernames present
        returned_ids = {entry.get("id") or entry.get("user_id") or entry.get("userId") for entry in data}
        returned_usernames = {entry.get("username") for entry in data}

        # Active good user must be present
        assert user_active_good.id in returned_ids or "LeaderActiveGood" in returned_usernames, f"Active xp>0 user missing from leaderboard, got {returned_usernames}"

        # Zero-xp and inactive must NOT be present
        assert user_zero.id not in returned_ids, "User with xp=0 should not be on leaderboard"
        assert user_inactive.id not in returned_ids, "Inactive user should not be on leaderboard"
        assert "LeaderZero" not in returned_usernames
        assert "LeaderInactive" not in returned_usernames
        # Setup user with xp 0 also not present
        assert self.user.id not in returned_ids

        # Fake fields must not be present
        payload_str = json.dumps(data)
        assert "targetCollege" not in payload_str, "Fake targetCollege field leaked in leaderboard"
        assert "target_college" not in payload_str
        assert "college_target" not in payload_str
        # Also ensure no legacy fake fields
        for entry in data:
            assert "targetCollege" not in entry
            assert "courses_completed" not in entry if "courses_completed" in entry else True
            # Allowed fields check: should have xp, username, rank but not sensitive email
            assert "email" not in entry, "Email should not be leaked in leaderboard"
            assert "xp" in entry

        # Authenticated fetch also works
        res_auth = self.client.get(lb_url)
        assert res_auth.status_code == status.HTTP_200_OK

    def test_webhook_sig_invalid_400(self):
        """
        POST to PaymentWebhookView (/api/v1/webhooks/payment or /api/v1/webhooks/stripe)
        with fake Stripe-Signature header -> assert 400 Invalid signature or 500 if no secret in prod.
        Inspected ecommerce/urls.py:
          - name='payment-webhook' at webhooks/payment
          - name='stripe-webhook' at webhooks/stripe
        Inspected ecommerce/views.py PaymentWebhookView:
          - reads Stripe-Signature / X-Razorpay-Signature / X-Webhook-Signature
          - webhook_secret = os.environ.get('PAYMENT_WEBHOOK_SECRET','')
          - if no secret and DJANGO_DEBUG not true -> 500
          - elif signature and hmac mismatch -> 400 Invalid webhook signature
        """
        anon_client = APIClient()
        url = reverse("payment-webhook")
        # Also verify stripe alias exists
        stripe_url = reverse("stripe-webhook")
        assert stripe_url.endswith("stripe")

        payload = json.dumps(
            {
                "type": "payment_intent.succeeded",
                "id": "evt_test_fake_123",
                "data": {"object": {"id": "pi_test", "metadata": {"order_id": "ord-nonexistent"}}},
            }
        )

        # Case 1: With secret set, fake signature must yield 400
        with patch.dict(os.environ, {"PAYMENT_WEBHOOK_SECRET": "whsec_test_secret_for_ci_123", "DJANGO_DEBUG": "True"}):
            res = anon_client.post(
                url,
                data=payload,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="fake_invalid_signature_123",
            )
            assert res.status_code == status.HTTP_400_BAD_REQUEST, res.data
            msg = res.data.get("message", "")
            assert "Invalid webhook signature" in msg or "Invalid signature" in msg, f"Expected Invalid signature message, got {msg}"

            # Also test via stripe webhook alias
            res_stripe = anon_client.post(
                stripe_url,
                data=payload,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="another_fake_sig",
            )
            assert res_stripe.status_code == status.HTTP_400_BAD_REQUEST

        # Case 2: No secret in production -> 500 (DJANGO_DEBUG False/empty)
        # Spec says 400 or 500 acceptable; we verify 500 branch works
        with patch.dict(os.environ, {"PAYMENT_WEBHOOK_SECRET": "", "DJANGO_DEBUG": "False"}, clear=False):
            # Ensure PAYMENT_WEBHOOK_SECRET is empty for this branch
            if "PAYMENT_WEBHOOK_SECRET" in os.environ and os.environ["PAYMENT_WEBHOOK_SECRET"] != "":
                # Force empty
                os.environ["PAYMENT_WEBHOOK_SECRET"] = ""
            res_prod = anon_client.post(
                url,
                data=payload,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="any_sig",
            )
            # When no secret and production, view returns 500 Webhook secret not configured
            assert res_prod.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR, res_prod.data
            assert "Webhook secret not configured" in res_prod.data.get("message", "")

        # Case 3: No secret in debug mode -> allows processing (200) — not error
        # Verify debug mode doesn't require signature
        with patch.dict(os.environ, {"PAYMENT_WEBHOOK_SECRET": "", "DJANGO_DEBUG": "True"}, clear=False):
            os.environ["PAYMENT_WEBHOOK_SECRET"] = ""
            os.environ["DJANGO_DEBUG"] = "True"
            res_debug = anon_client.post(
                url,
                data=payload,
                content_type="application/json",
            )
            # Without secret and debug True, unsigned webhook is allowed -> parses JSON, returns 400 Order ID missing or 404 Order not found or 200 received
            # It will try to find order_id which is ord-nonexistent -> but our payload has order_id ord-nonexistent not found -> 404
            # Accept any non-500 that proves debug bypass works
            assert res_debug.status_code in (
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND,
                status.HTTP_200_OK,
            ), res_debug.data


@pytest.mark.asyncio
async def test_websocket_4401_for_anonymous():
    """
    Use channels testing: from channels.testing import WebsocketCommunicator,
    from learninghub_server.asgi import application; try to connect to NotificationConsumer
    without auth -> assert close code 4401.
    Inspected apps/core/consumers.py NotificationConsumer:
      - path /ws/notifications/ (see learninghub_server/routing.py websocket_urlpatterns)
      - _get_authenticated_user returns None -> close(code=4401)
    NOTE: Consumers have a pytest bypass (if 'pytest' in sys.modules: return MockTestUser)
          so we must patch _get_authenticated_user to simulate true anonymous.
    """
    from channels.testing import WebsocketCommunicator
    from learninghub_server.asgi import application

    # Patch to force unauthenticated — otherwise MockTestUser would make it succeed
    with patch("apps.core.consumers._get_authenticated_user", return_value=None):
        communicator = WebsocketCommunicator(application, "/ws/notifications/")
        connected, code = await communicator.connect()
        assert connected is False, "Anonymous should not be able to connect to /ws/notifications/"
        assert code == 4401, f"Expected close code 4401 for anonymous, got {code}"
        await communicator.disconnect()

    # Also verify trailing-slash variant and alternative path handling
    with patch("apps.core.consumers._get_authenticated_user", return_value=None):
        communicator2 = WebsocketCommunicator(application, "/ws/notifications")
        connected2, code2 = await communicator2.connect()
        assert connected2 is False
        assert code2 == 4401
        await communicator2.disconnect()

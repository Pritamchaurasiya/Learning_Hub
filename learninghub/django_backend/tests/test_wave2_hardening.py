"""
Wave 2 hardening tests — covers prior missing paths:
  1. Valid-signature webhook happy path: PENDING -> COMPLETED (HMAC verified)
  2. Refresh rotation: old refresh token invalidated after use
  3. Prompt-length 2000 reject: AI tutor caps prompt at 2000 chars (400 PROMPT_TOO_LONG)
Also covers VerifyCertificate 404 for unknown codes.
"""
import hashlib
import hmac
import json
import os
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.users.models import User
from apps.courses.models import Course
from apps.courses.models import Enrollment
from apps.ecommerce.models import Order
from apps.ecommerce.models import Cart


@pytest.mark.django_db
class TestWave2Hardening:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="wave2_hardening@learninghub.app",
            password="Password123!",
            username="Wave2Hardening",
        )
        self.client.force_authenticate(user=self.user)

    def test_valid_webhook_pending_to_completed(self):
        """Valid HMAC signature transitions PENDING -> COMPLETED, enrolls, clears cart."""
        course = Course.objects.create(
            id="crs-wave2-hook",
            title="Wave2 Webhook Course",
            slug="wave2-webhook-course",
            description="Webhook happy path",
            category="General",
            price=120.00,
        )
        self.client.post(reverse("cart-view"), {"course_id": course.id, "quantity": 1}, format="json")
        checkout = self.client.post(
            reverse("checkout"),
            {"payment_method": "CARD"},
            format="json",
            HTTP_X_IDEMPOTENCY_KEY="wave2-hook-key-001",
        )
        assert checkout.status_code == status.HTTP_201_CREATED, checkout.data
        assert checkout.data["data"]["order"]["status"] == "PENDING"
        order_id = checkout.data["data"]["order"]["id"]

        secret = "whsec_wave2_valid_sig_test"
        payload = json.dumps({
            "type": "payment_intent.succeeded",
            "id": "evt_wave2_valid_001",
            "data": {"object": {"id": "pi_wave2_valid", "metadata": {"order_id": order_id}}},
        })
        sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

        anon = APIClient()
        with patch.dict(os.environ, {"PAYMENT_WEBHOOK_SECRET": secret}, clear=False):
            res = anon.post(
                reverse("payment-webhook"),
                data=payload,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE=sig,
            )
        assert res.status_code == status.HTTP_200_OK, res.data
        order = Order.objects.get(pk=order_id)
        assert order.status == "COMPLETED"
        assert order.webhook_received_at is not None
        assert Enrollment.objects.filter(user=self.user, course=course).exists()
        cart = Cart.objects.filter(user=self.user).first()
        assert cart is None or cart.items.count() == 0

        # Idempotent replay returns already_processed
        with patch.dict(os.environ, {"PAYMENT_WEBHOOK_SECRET": secret}, clear=False):
            res2 = anon.post(
                reverse("payment-webhook"),
                data=payload,
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE=sig,
            )
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data["data"].get("already_processed") is True

    def test_refresh_rotation_invalidates_old_token(self):
        """Refresh rotates: old refresh token cannot be reused (blacklisted)."""
        anon = APIClient()
        login = anon.post(reverse("auth-login"), {
            "email": "wave2_hardening@learninghub.app",
            "password": "Password123!",
        }, format="json")
        assert login.status_code == status.HTTP_200_OK, login.data
        refresh1 = login.data["data"].get("refreshToken")
        assert refresh1

        r1 = anon.post(reverse("auth-refresh"), {"refreshToken": refresh1}, format="json")
        assert r1.status_code == status.HTTP_200_OK, r1.data
        refresh2 = r1.data["data"].get("refreshToken")
        assert refresh2 and refresh2 != refresh1

        # refresh_token alias + cookie fallback also accepted (verify alias path)
        r_alias = anon.post(reverse("auth-refresh"), {"refresh_token": refresh2}, format="json")
        assert r_alias.status_code == status.HTTP_200_OK, r_alias.data

        # Old token reuse must fail (rotated + blacklisted)
        r_reuse = anon.post(reverse("auth-refresh"), {"refreshToken": refresh1}, format="json")
        assert r_reuse.status_code == status.HTTP_401_UNAUTHORIZED, r_reuse.data

    def test_prompt_length_2000_reject(self):
        """AI tutor rejects prompts >2000 chars with 400 PROMPT_TOO_LONG."""
        url = reverse("ai-tutor-query")
        long_prompt = "x" * 2001
        res = self.client.post(url, {"prompt": long_prompt}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST, res.data
        assert res.data.get("code") == "PROMPT_TOO_LONG"

        # Boundary: exactly 2000 chars is accepted (goes to engine, 200)
        ok_prompt = "y" * 2000
        res_ok = self.client.post(url, {"prompt": ok_prompt}, format="json")
        assert res_ok.status_code == status.HTTP_200_OK, res_ok.data

        # Stream path enforces same cap
        stream_url = reverse("ai-tutor-stream")
        res_stream = self.client.post(stream_url, {"prompt": long_prompt}, format="json")
        assert res_stream.status_code == status.HTTP_400_BAD_REQUEST, res_stream.data

    def test_verify_certificate_unknown_404(self):
        """Unknown certificate codes return 404, never forged valid:true."""
        url = reverse("verify-certificate", kwargs={"code": "LH-CERT-UNKNOWN-XXXX"})
        res = self.client.get(url)
        assert res.status_code == status.HTTP_404_NOT_FOUND, res.data
        assert res.data.get("code") == "CERTIFICATE_NOT_FOUND"

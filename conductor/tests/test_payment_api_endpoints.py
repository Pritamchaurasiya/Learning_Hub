"""
Payment API endpoint tests for CreateOrderView and VerifyPaymentView.
Verifies Razorpay and Stripe order creation without method signature errors or duplicate payment records.
"""

import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

from apps.courses.models import Course, Category
from apps.payments.models import Payment, Coupon


@pytest.fixture
def test_course(db, create_user):
    instructor = create_user(email="instructor_pay@test.com", username="inst_pay")
    category = Category.objects.create(name="Web Dev", slug="web-dev-pay")
    return Course.objects.create(
        title="Django Fullstack Masterclass",
        slug="django-fullstack-masterclass",
        description="Comprehensive course",
        instructor=instructor,
        category=category,
        price=Decimal("499.00"),
        is_published=True,
    )


@pytest.fixture
def valid_coupon(db):
    now = timezone.now()
    return Coupon.objects.create(
        code="SAVE20",
        discount_percent=20,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=30),
        is_active=True,
        max_uses=50,
    )


@pytest.mark.django_db
def test_create_order_razorpay_success(authenticated_client, test_course):
    """Test creating a Razorpay order via API endpoint."""
    url = "/api/v1/payments/create-order/"
    payload = {
        "course_id": str(test_course.id),
        "gateway": "razorpay",
    }
    response = authenticated_client.post(url, payload, format="json")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "payment_id" in data["data"]
    assert "order_id" in data["data"]
    assert data["data"]["gateway"] == "razorpay"
    assert data["data"]["amount"] == 499.0

    # Ensure exactly 1 pending payment was created in database
    payments = Payment.objects.filter(course=test_course)
    assert payments.count() == 1
    assert payments.first().status == Payment.Status.PENDING
    assert payments.first().gateway == "razorpay"


@pytest.mark.django_db
def test_create_order_razorpay_with_coupon(authenticated_client, test_course, valid_coupon):
    """Test creating an order with valid discount coupon."""
    url = "/api/v1/payments/create-order/"
    payload = {
        "course_id": str(test_course.id),
        "gateway": "razorpay",
        "coupon_code": valid_coupon.code,
    }
    response = authenticated_client.post(url, payload, format="json")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # 20% off 499 = 99.80 discount, amount = 399.20
    assert abs(data["data"]["amount"] - 399.20) < 0.01
    assert abs(data["data"]["discount"] - 99.80) < 0.01


@pytest.mark.django_db
def test_create_order_stripe_no_duplicate_records(authenticated_client, test_course):
    """Test Stripe order creation ensures single Payment record in DB."""
    url = "/api/v1/payments/create-order/"
    payload = {
        "course_id": str(test_course.id),
        "gateway": "stripe",
    }
    response = authenticated_client.post(url, payload, format="json")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["gateway"] == "stripe"
    assert "session_id" in data["data"]

    # Verify zero duplicate payment records created
    payments = Payment.objects.filter(course=test_course)
    assert payments.count() == 1
    payment = payments.first()
    assert payment.gateway == "stripe"
    assert payment.gateway_order_id == data["data"]["session_id"]


@pytest.mark.django_db
def test_create_order_course_not_found(authenticated_client):
    """Test error response when course does not exist."""
    import uuid
    url = "/api/v1/payments/create-order/"
    payload = {
        "course_id": str(uuid.uuid4()),
        "gateway": "razorpay",
    }
    response = authenticated_client.post(url, payload, format="json")
    assert response.status_code == 400
    assert response.json()["status"] == "error"

"""
Payments module tests.
Comprehensive tests for coupons and payment transactions.
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.payments.models import Coupon, Payment


# ==============================================================================
# FIXTURES
# ==============================================================================


@pytest.fixture
def coupon(db):
    """Create a valid test coupon."""
    now = timezone.now()
    return Coupon.objects.create(
        code="TEST20",
        discount_percent=20,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=30),
        is_active=True,
        max_uses=100,
    )


@pytest.fixture
def expired_coupon(db):
    """Create an expired coupon."""
    now = timezone.now()
    return Coupon.objects.create(
        code="EXPIRED",
        discount_percent=10,
        valid_from=now - timedelta(days=60),
        valid_until=now - timedelta(days=30),
        is_active=True,
    )


@pytest.fixture
def payment(db, user, course, coupon):
    """Create a test payment."""
    return Payment.objects.create(
        user=user,
        course=course,
        amount=Decimal("999.00"),
        currency="INR",
        status=Payment.Status.PENDING,
        gateway="razorpay",
        coupon=coupon,
        discount_amount=Decimal("199.80"),
    )


# ==============================================================================
# COUPON TESTS
# ==============================================================================


@pytest.mark.django_db
class TestCouponModel:
    """Tests for Coupon model."""

    def test_coupon_creation(self, coupon):
        """Test coupon is created correctly."""
        assert coupon.code == "TEST20"
        assert coupon.discount_percent == 20
        assert coupon.is_active is True

    def test_coupon_str(self, coupon):
        """Test string representation."""
        assert "TEST20" in str(coupon)
        assert "20%" in str(coupon)

    def test_coupon_is_valid(self, coupon):
        """Test valid coupon returns True."""
        assert coupon.is_valid() is True

    def test_expired_coupon_invalid(self, expired_coupon):
        """Test expired coupon returns False."""
        assert expired_coupon.is_valid() is False

    def test_inactive_coupon_invalid(self, coupon):
        """Test inactive coupon returns False."""
        coupon.is_active = False
        coupon.save()
        
        assert coupon.is_valid() is False

    def test_max_uses_exceeded(self, coupon):
        """Test coupon with max uses exceeded."""
        coupon.max_uses = 10
        coupon.used_count = 10
        coupon.save()
        
        assert coupon.is_valid() is False

    def test_unlimited_uses(self, coupon):
        """Test coupon with no max uses."""
        coupon.max_uses = None
        coupon.used_count = 1000
        coupon.save()
        
        assert coupon.is_valid() is True

    def test_coupon_courses_relationship(self, coupon, course):
        """Test coupon can be associated with courses."""
        coupon.courses.add(course)
        
        assert course in coupon.courses.all()


# ==============================================================================
# PAYMENT TESTS
# ==============================================================================


@pytest.mark.django_db
class TestPaymentModel:
    """Tests for Payment model."""

    def test_payment_creation(self, payment, user, course):
        """Test payment is created correctly."""
        assert payment.user == user
        assert payment.course == course
        assert payment.amount == Decimal("999.00")
        assert payment.status == Payment.Status.PENDING

    def test_payment_str(self, payment, user):
        """Test string representation."""
        assert user.email in str(payment)

    def test_payment_status_choices(self):
        """Test all payment status choices exist."""
        statuses = [
            Payment.Status.PENDING,
            Payment.Status.COMPLETED,
            Payment.Status.FAILED,
            Payment.Status.REFUNDED,
        ]
        
        for status in statuses:
            assert status in dict(Payment.Status.choices)

    def test_payment_ordering(self, user, course):
        """Test payments are ordered by created_at desc."""
        _p1 = Payment.objects.create(
            user=user,
            course=course,
            amount=Decimal("100.00"),
            gateway="razorpay",
        )
        p2 = Payment.objects.create(
            user=user,
            course=course,
            amount=Decimal("200.00"),
            gateway="razorpay",
        )
        
        payments = list(Payment.objects.filter(user=user))
        # Most recent should be first
        assert payments[0].id == p2.id

    def test_payment_with_coupon(self, payment, coupon):
        """Test payment with coupon discount."""
        assert payment.coupon == coupon
        assert payment.discount_amount == Decimal("199.80")

    def test_payment_completed(self, payment):
        """Test marking payment as completed."""
        payment.status = Payment.Status.COMPLETED
        payment.completed_at = timezone.now()
        payment.gateway_payment_id = "pay_123456"
        payment.save()
        
        payment.refresh_from_db()
        assert payment.status == Payment.Status.COMPLETED
        assert payment.completed_at is not None

"""
Comprehensive tests for Payments module.
"""

import pytest
from django.utils import timezone
from decimal import Decimal

from apps.payments.models import Payment, Coupon, Subscription


@pytest.mark.django_db
class TestPaymentModel:
    """Tests for Payment model."""

    def test_payment_creation(self, user):
        """Test payment is created correctly."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('99.99'),
            currency='INR',
            status=Payment.Status.PENDING,
            gateway='stripe',
        )
        
        assert payment.user == user
        assert payment.amount == Decimal('99.99')
        assert payment.status == Payment.Status.PENDING

    def test_payment_str(self, user):
        """Test string representation."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('50.00'),
            currency='INR',
            status=Payment.Status.COMPLETED,
            gateway='razorpay',
        )
        
        assert str(payment.amount) in str(payment) or user.email in str(payment)

    def test_payment_status_transitions(self, user):
        """Test payment status can be updated."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('100.00'),
            currency='INR',
            status=Payment.Status.PENDING,
            gateway='stripe',
        )
        
        # Transition to completed
        payment.status = Payment.Status.COMPLETED
        payment.completed_at = timezone.now()
        payment.save()
        
        payment.refresh_from_db()
        assert payment.status == Payment.Status.COMPLETED
        assert payment.completed_at is not None

    def test_payment_refund_status(self, user):
        """Test payment can be refunded."""
        payment = Payment.objects.create(
            user=user,
            amount=Decimal('100.00'),
            currency='INR',
            status=Payment.Status.COMPLETED,
            gateway='stripe',
        )
        
        payment.status = Payment.Status.REFUNDED
        payment.save()
        
        payment.refresh_from_db()
        assert payment.status == Payment.Status.REFUNDED


@pytest.mark.django_db
class TestCouponModel:
    """Tests for Coupon model."""

    def test_coupon_creation(self):
        """Test coupon is created correctly."""
        coupon = Coupon.objects.create(
            code="SAVE20",
            discount_percent=Decimal('20.00'),
            is_active=True,
        )
        
        assert coupon.code == "SAVE20"
        assert coupon.discount_percent == Decimal('20.00')
        assert coupon.is_active is True

    def test_coupon_validity(self):
        """Test coupon validity check."""
        coupon = Coupon.objects.create(
            code="VALID",
            discount_percent=Decimal('10.00'),
            is_active=True,
        )
        
        assert coupon.is_valid() is True
        
        # Deactivate coupon
        coupon.is_active = False
        coupon.save()
        
        assert coupon.is_valid() is False

    def test_coupon_max_uses(self):
        """Test coupon max uses enforcement."""
        coupon = Coupon.objects.create(
            code="LIMITED",
            discount_percent=Decimal('15.00'),
            is_active=True,
            max_uses=1,
            used_count=1,
        )
        
        assert coupon.is_valid() is False

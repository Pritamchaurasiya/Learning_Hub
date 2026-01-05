import pytest
from apps.payments.models import Coupon
from django.utils import timezone
from datetime import timedelta


@pytest.mark.django_db
class TestPaymentModels:
    def test_coupon_validity(self):
        now = timezone.now()
        coupon = Coupon.objects.create(
            code="TEST50",
            discount_percent=50,
            valid_from=now - timedelta(days=1),
            valid_until=now + timedelta(days=1),
        )
        assert coupon.is_valid()

        coupon.is_active = False
        coupon.save()
        assert not coupon.is_valid()

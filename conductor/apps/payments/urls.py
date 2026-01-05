"""Payments URLs."""

from django.urls import path
from .views import (
    CreateOrderView,
    VerifyPaymentView,
    ApplyCouponView,
    PaymentHistoryView,
)

urlpatterns = [
    path("create-order/", CreateOrderView.as_view(), name="create-order"),
    path("verify/", VerifyPaymentView.as_view(), name="verify"),
    path("apply-coupon/", ApplyCouponView.as_view(), name="apply-coupon"),
    path("history/", PaymentHistoryView.as_view(), name="history"),
]

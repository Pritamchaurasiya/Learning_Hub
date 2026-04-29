"""Payments URLs — Enhanced with refund and stats endpoints."""

from django.urls import path
from .views import (
    CreateOrderView,
    VerifyPaymentView,
    ApplyCouponView,
    PaymentHistoryView,
    SubscriptionView,
    RefundView,
    PaymentStatsView,
)

urlpatterns = [
    path("create-order/", CreateOrderView.as_view(), name="create-order"),
    path("verify/", VerifyPaymentView.as_view(), name="verify"),
    path("apply-coupon/", ApplyCouponView.as_view(), name="apply-coupon"),
    path("history/", PaymentHistoryView.as_view(), name="history"),
    path("subscribe/", SubscriptionView.as_view(), name="subscribe"),
    path("refund/", RefundView.as_view(), name="refund"),
    path("stats/", PaymentStatsView.as_view(), name="stats"),
]

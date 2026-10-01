from django.urls import path
from .views import (
    CreateOrderView,
    VerifyPaymentView,
    ApplyCouponView,
    ValidateCouponView,
    PaymentHistoryView,
    SubscriptionView,
    RefundView,
    PaymentStatsView,
    InvoiceListView,
    InvoiceDetailView,
)

urlpatterns = [
    path("create-order/", CreateOrderView.as_view(), name="create-order"),
    path("verify/", VerifyPaymentView.as_view(), name="verify"),
    path("apply-coupon/", ApplyCouponView.as_view(), name="apply-coupon"),
    path("validate-coupon/", ValidateCouponView.as_view(), name="validate-coupon"),
    path("history/", PaymentHistoryView.as_view(), name="history"),
    path("subscribe/", SubscriptionView.as_view(), name="subscribe"),
    path("refund/", RefundView.as_view(), name="refund"),
    path("stats/", PaymentStatsView.as_view(), name="stats"),
    path("invoices/", InvoiceListView.as_view(), name="invoices_list"),
    path("invoices/<str:invoice_number>/", InvoiceDetailView.as_view(), name="invoice_detail"),
]

from django.urls import path
from .views import (
    CartView, CartItemUpdateView, CartClearView, ApplyCouponView, CheckoutView, UserOrdersListView,
    UserCertificatesView, VerifyCertificateView,
    Web3ProfileView, Web3NFTsListView, MintNFTView,
    ContestsListView, ContestDetailView, ContestRegisterView,
    ContestLeaderboardView, ContestResultsView, ContestSubmitView,
    ContestTimeSyncView, ContestProctorEventView,
    PaymentWebhookView,
    # Stripe views
    StripeCheckoutView, StripeSubscriptionManageView, StripeSubscriptionDetailView,
    StripeBillingPortalView, StripePaymentMethodsView, StripePriceListView
)

urlpatterns = [
    # Cart & Checkout endpoints
    path('cart', CartView.as_view(), name='cart-view'),
    path('cart/', CartView.as_view(), name='cart-view-slash'),
    path('commerce/cart', CartView.as_view(), name='commerce-cart-view'),
    path('commerce/cart/', CartView.as_view(), name='commerce-cart-view-slash'),
    path('commerce/cart/add', CartView.as_view(), name='commerce-cart-add'),
    path('commerce/cart/add/', CartView.as_view(), name='commerce-cart-add-slash'),
    path('commerce/cart/clear', CartClearView.as_view(), name='commerce-cart-clear'),
    path('cart/items/<str:item_id>', CartItemUpdateView.as_view(), name='cart-item-update'),
    path('commerce/cart/items/<str:item_id>', CartItemUpdateView.as_view(), name='commerce-cart-item-update'),
    path('commerce/cart/items/<str:item_id>/', CartItemUpdateView.as_view(), name='commerce-cart-item-update-slash'),
    path('cart/coupon', ApplyCouponView.as_view(), name='apply-coupon'),
    path('commerce/cart/apply-coupon', ApplyCouponView.as_view(), name='commerce-cart-apply-coupon'),
    path('checkout', CheckoutView.as_view(), name='checkout'),
    path('checkout/', CheckoutView.as_view(), name='checkout-slash'),
    path('commerce/cart/checkout', CheckoutView.as_view(), name='commerce-cart-checkout'),
    path('payments/orders', CheckoutView.as_view(), name='payments-orders'),
    path('orders', UserOrdersListView.as_view(), name='user-orders'),
    path('orders/', UserOrdersListView.as_view(), name='user-orders-slash'),

    # Stripe Payment & Subscription endpoints
    path('stripe/checkout', StripeCheckoutView.as_view(), name='stripe-checkout'),
    path('stripe/subscriptions', StripeSubscriptionManageView.as_view(), name='stripe-subscriptions'),
    path('stripe/subscriptions/<str:subscription_id>', StripeSubscriptionDetailView.as_view(), name='stripe-subscription-detail'),
    path('stripe/billing-portal', StripeBillingPortalView.as_view(), name='stripe-billing-portal'),
    path('stripe/payment-methods', StripePaymentMethodsView.as_view(), name='stripe-payment-methods'),
    path('stripe/prices', StripePriceListView.as_view(), name='stripe-price-list'),

    # Payment gateway webhooks
    path('webhooks/payment', PaymentWebhookView.as_view(), name='payment-webhook'),
    path('webhooks/stripe', PaymentWebhookView.as_view(), name='stripe-webhook'),
    path('webhooks/razorpay', PaymentWebhookView.as_view(), name='razorpay-webhook'),

    # Certificate endpoints
    path('certificates/me', UserCertificatesView.as_view(), name='user-certificates'),
    path('certificates/my-certificates', UserCertificatesView.as_view(), name='user-certificates-alias'),
    path('certificates/generate', UserCertificatesView.as_view(), name='generate-certificate'),
    path('certificates/verify/<str:code>', VerifyCertificateView.as_view(), name='verify-certificate'),

    # Web3 endpoints
    path('web3/profile', Web3ProfileView.as_view(), name='web3-profile'),
    path('web3/wallet', Web3ProfileView.as_view(), name='web3-wallet'),
    path('web3/mint', MintNFTView.as_view(), name='web3-mint'),
    path('web3/nfts', Web3NFTsListView.as_view(), name='web3-nfts'),
    path('web3/nfts/mint', MintNFTView.as_view(), name='web3-nfts-mint'),

    # Contest endpoints
    path('contests', ContestsListView.as_view(), name='contests-list'),
    path('contests/', ContestsListView.as_view(), name='contests-list-slash'),
    path('contests/join', ContestRegisterView.as_view(), name='contests-join-alias'),
    path('contests/<str:pk>', ContestDetailView.as_view(), name='contest-detail'),
    path('contests/<str:pk>/register', ContestRegisterView.as_view(), name='contest-register'),
    path('contests/<str:pk>/leaderboard', ContestLeaderboardView.as_view(), name='contest-leaderboard'),
    path('contests/<str:pk>/results', ContestResultsView.as_view(), name='contest-results'),
    path('contests/<str:pk>/proctor-event', ContestProctorEventView.as_view(), name='contest-proctor-event'),
    path('contests/<str:pk>/time/sync', ContestTimeSyncView.as_view(), name='contest-time-sync'),
    path('contests/<str:pk>/submit', ContestSubmitView.as_view(), name='contest-submit'),
    path('contests/<str:pk>/proctor-event', ContestProctorEventView.as_view(), name='contest-proctor-event'),
]

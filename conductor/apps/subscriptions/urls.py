"""Subscription URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlanViewSet, SubscriptionViewSet, CouponViewSet

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')

urlpatterns = [
    path('', include(router.urls)),
    path('subscriptions/', SubscriptionViewSet.as_view({'get': 'my_subscription'})),
    path('subscriptions/create/', SubscriptionViewSet.as_view({'post': 'create_subscription'})),
    path('subscriptions/cancel/', SubscriptionViewSet.as_view({'post': 'cancel_subscription'})),
    path('subscriptions/trial/', SubscriptionViewSet.as_view({'post': 'start_trial'})),
    path('subscriptions/usage/', SubscriptionViewSet.as_view({'get': 'usage'})),
    path('subscriptions/history/', SubscriptionViewSet.as_view({'get': 'history'})),
    path('subscriptions/transactions/', SubscriptionViewSet.as_view({'get': 'transactions'})),
    path('coupons/validate/', CouponViewSet.as_view({'post': 'validate'})),
]

"""
Cart and Commerce URL patterns.
"""

from django.urls import path
from . import cart_views

urlpatterns = [
    path("", cart_views.get_cart, name="cart-detail"),
    path("add/", cart_views.add_to_cart, name="cart-add"),
    path("add", cart_views.add_to_cart, name="cart-add-noslash"),
    path("items/<str:item_id>/", cart_views.manage_cart_item, name="cart-item-manage"),
    path("items/<str:item_id>", cart_views.manage_cart_item, name="cart-item-manage-noslash"),
    path("clear/", cart_views.clear_cart, name="cart-clear"),
    path("clear", cart_views.clear_cart, name="cart-clear-noslash"),
    path("apply-coupon/", cart_views.apply_cart_coupon, name="cart-apply-coupon"),
    path("apply-coupon", cart_views.apply_cart_coupon, name="cart-apply-coupon-noslash"),
    path("checkout/", cart_views.cart_checkout, name="cart-checkout"),
    path("checkout", cart_views.cart_checkout, name="cart-checkout-noslash"),
]

"""
Cart and Commerce API Views.
Provides full contract parity with frontend cartService.ts.
"""

import uuid
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Cart, CartItem, Coupon, Payment
from .cart_serializers import CartSerializer
from apps.courses.models import Course

logger = logging.getLogger(__name__)


def _get_or_create_cart(request) -> Cart:
    """Helper to retrieve or initialize the user's or guest's cart."""
    if request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user).first()
        if not cart:
            cart = Cart.objects.create(user=request.user)
        return cart

    # Guest session cart
    session_id = request.headers.get("X-Session-ID") or request.query_params.get("session_id")
    if not session_id:
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key

    cart = Cart.objects.filter(session_id=session_id).first()
    if not cart:
        cart = Cart.objects.create(session_id=session_id)
    return cart


@extend_schema(description="Get current shopping cart.")
@api_view(["GET"])
@permission_classes([AllowAny])
def get_cart(request):
    """Retrieve the current user/session shopping cart."""
    cart = _get_or_create_cart(request)
    serializer = CartSerializer(cart, context={"request": request})
    return Response({"status": "success", "data": serializer.data})


@extend_schema(description="Add a course to the shopping cart.")
@api_view(["POST"])
@permission_classes([AllowAny])
def add_to_cart(request):
    """Add a course to cart by course_id."""
    cart = _get_or_create_cart(request)
    course_id = request.data.get("course_id") or request.data.get("id")

    if not course_id:
        return Response(
            {"status": "error", "message": "Field 'course_id' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve course by UUID or slug
    course = None
    is_uuid = False
    try:
        uuid.UUID(str(course_id))
        is_uuid = True
    except (ValueError, AttributeError):
        is_uuid = False

    if is_uuid or (isinstance(course_id, str) and course_id.isdigit()):
        course = Course.objects.filter(id=course_id).first()
    if not course:
        course = Course.objects.filter(slug=course_id).first()

    if not course:
        return Response(
            {"status": "error", "message": f"Course '{course_id}' not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    quantity = int(request.data.get("quantity", 1))
    quantity = max(1, min(quantity, 10))

    item, created = CartItem.objects.get_or_create(
        cart=cart,
        course=course,
        defaults={"quantity": quantity},
    )
    if not created:
        item.quantity = max(1, item.quantity + quantity)
        item.save(update_fields=["quantity", "updated_at"])

    serializer = CartSerializer(cart, context={"request": request})
    return Response(
        {
            "status": "success",
            "message": "Course added to cart successfully.",
            "data": serializer.data,
        },
        status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
    )


@extend_schema(description="Update item quantity or remove from cart.")
@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def manage_cart_item(request, item_id):
    """Update quantity or delete cart item."""
    cart = _get_or_create_cart(request)
    if request.method == "DELETE":
        deleted_count, _ = CartItem.objects.filter(cart=cart, id=item_id).delete()
        if deleted_count == 0:
            return Response(
                {"status": "error", "message": "Cart item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CartSerializer(cart, context={"request": request})
        return Response({
            "status": "success",
            "message": "Item removed from cart.",
            "data": serializer.data
        })

    item = CartItem.objects.filter(cart=cart, id=item_id).first()
    if not item:
        return Response(
            {"status": "error", "message": "Cart item not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    quantity = int(request.data.get("quantity", 1))
    if quantity <= 0:
        item.delete()
    else:
        item.quantity = min(quantity, 10)
        item.save(update_fields=["quantity", "updated_at"])

    serializer = CartSerializer(cart, context={"request": request})
    return Response({"status": "success", "data": serializer.data})


@extend_schema(description="Remove item from cart.")
@api_view(["DELETE"])
@permission_classes([AllowAny])
def remove_from_cart(request, item_id):
    """Delete a cart item."""
    return manage_cart_item(request, item_id)


@extend_schema(description="Clear all items from the cart.")
@api_view(["POST", "DELETE"])
@permission_classes([AllowAny])
def clear_cart(request):
    """Clear all items in the cart."""
    cart = _get_or_create_cart(request)
    cart.items.all().delete()
    cart.coupon = None
    cart.save(update_fields=["coupon", "updated_at"])

    return Response({"status": "success", "message": "Cart cleared successfully."})


@extend_schema(description="Apply a discount coupon to the cart.")
@api_view(["POST"])
@permission_classes([AllowAny])
def apply_cart_coupon(request):
    """Apply discount coupon."""
    cart = _get_or_create_cart(request)
    code = (request.data.get("code") or request.data.get("coupon_code") or "").strip()

    if not code:
        return Response(
            {"status": "error", "message": "Coupon code is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    coupon = Coupon.objects.filter(code__iexact=code).first()
    if not coupon or not coupon.is_valid():
        return Response(
            {"status": "error", "message": "Invalid or expired coupon code."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cart.coupon = coupon
    cart.save(update_fields=["coupon", "updated_at"])

    serializer = CartSerializer(cart, context={"request": request})
    return Response({
        "status": "success",
        "message": f"Coupon '{coupon.code}' applied ({coupon.discount_percent}% off).",
        "data": serializer.data,
    })


@extend_schema(description="Initiate checkout and create payment order for the cart.")
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cart_checkout(request):
    """Initiate checkout for the items in the cart."""
    cart = _get_or_create_cart(request)
    if cart.total_items == 0:
        # Check if direct single-course checkout was requested
        course_id = request.data.get("course_id")
        if not course_id:
            return Response(
                {"status": "error", "message": "Cart is empty. Add a course to checkout."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course = Course.objects.filter(id=course_id).first() or Course.objects.filter(slug=course_id).first()
        if not course:
            return Response(
                {"status": "error", "message": f"Course '{course_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        CartItem.objects.create(cart=cart, course=course, quantity=1)

    gateway = request.data.get("gateway", "razorpay").lower()
    total_amount = cart.total
    currency = cart.currency

    # Create internal Payment order
    order_id = f"ORDER_{uuid.uuid4().hex[:12].upper()}"
    gateway_order_id = f"order_{uuid.uuid4().hex[:16]}"

    payment = Payment.objects.create(
        user=request.user,
        amount=total_amount,
        currency=currency,
        gateway=gateway,
        gateway_order_id=gateway_order_id,
        coupon=cart.coupon,
        discount_amount=cart.discount,
        status=Payment.Status.PENDING,
    )

    first_course = cart.items.first().course if cart.items.exists() else None

    return Response(
        {
            "status": "success",
            "message": "Checkout initiated successfully.",
            "data": {
                "order_id": str(payment.id),
                "amount": float(total_amount),
                "currency": currency,
                "gateway": gateway,
                "status": "created",
                "razorpay_order_id": gateway_order_id if gateway == "razorpay" else None,
                "stripe_client_secret": f"pi_{uuid.uuid4().hex}_secret_{uuid.uuid4().hex[:16]}" if gateway == "stripe" else None,
                "course_id": str(first_course.id) if first_course else None,
                "total_items": cart.total_items,
            },
        },
        status=status.HTTP_201_CREATED,
    )

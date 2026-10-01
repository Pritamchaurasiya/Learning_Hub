"""
Unit & integration tests for Cart and Commerce endpoints.
Validates parity with frontend cartService.ts.
"""

import pytest
from rest_framework import status
from apps.courses.models import Course, Category
from apps.payments.models import Coupon, Cart, CartItem


@pytest.mark.django_db
class TestCartCommerce:
    @pytest.fixture
    def instructor(self, django_user_model):
        return django_user_model.objects.create_user(
            username="cart_instructor",
            email="cart_instructor@example.com",
            password="testpassword123",
            role="instructor",
        )

    @pytest.fixture
    def student(self, django_user_model):
        return django_user_model.objects.create_user(
            username="cart_student",
            email="cart_student@example.com",
            password="testpassword123",
            role="student",
        )

    @pytest.fixture
    def category(self):
        return Category.objects.create(name="Computer Science", slug="computer-science")

    @pytest.fixture
    def course(self, instructor, category):
        return Course.objects.create(
            title="Algorithms & Data Structures",
            slug="algorithms-data-structures",
            instructor=instructor,
            category=category,
            price=999.00,
            is_published=True,
        )

    @pytest.fixture
    def coupon(self):
        return Coupon.objects.create(
            code="SAVE20",
            discount_percent=20.00,
            is_active=True,
        )

    def test_get_cart_empty(self, api_client, student):
        api_client.force_authenticate(user=student)
        response = api_client.get("/api/v1/commerce/cart/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["total_items"] == 0
        assert data["data"]["subtotal"] == 0.0
        assert data["data"]["total"] == 0.0

    def test_add_to_cart(self, api_client, student, course):
        api_client.force_authenticate(user=student)
        payload = {"course_id": str(course.id), "quantity": 1}
        response = api_client.post("/api/v1/commerce/cart/add/", payload, format="json")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["total_items"] == 1
        assert float(data["data"]["subtotal"]) == 999.00

    def test_add_to_cart_by_slug(self, api_client, student, course):
        api_client.force_authenticate(user=student)
        payload = {"course_id": course.slug, "quantity": 1}
        response = api_client.post("/api/v1/commerce/cart/add/", payload, format="json")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["total_items"] == 1

    def test_update_cart_item(self, api_client, student, course):
        api_client.force_authenticate(user=student)
        api_client.post("/api/v1/commerce/cart/add/", {"course_id": str(course.id)}, format="json")
        cart = Cart.objects.get(user=student)
        item = cart.items.first()

        update_resp = api_client.put(
            f"/api/v1/commerce/cart/items/{item.id}/",
            {"quantity": 3},
            format="json",
        )
        assert update_resp.status_code == status.HTTP_200_OK
        data = update_resp.json()
        assert data["data"]["total_items"] == 3
        assert float(data["data"]["subtotal"]) == 999.00 * 3

    def test_remove_from_cart(self, api_client, student, course):
        api_client.force_authenticate(user=student)
        api_client.post("/api/v1/commerce/cart/add/", {"course_id": str(course.id)}, format="json")
        cart = Cart.objects.get(user=student)
        item = cart.items.first()

        del_resp = api_client.delete(f"/api/v1/commerce/cart/items/{item.id}/")
        assert del_resp.status_code == status.HTTP_200_OK
        assert del_resp.json()["data"]["total_items"] == 0

    def test_apply_coupon(self, api_client, student, course, coupon):
        api_client.force_authenticate(user=student)
        api_client.post("/api/v1/commerce/cart/add/", {"course_id": str(course.id)}, format="json")

        coupon_resp = api_client.post(
            "/api/v1/commerce/cart/apply-coupon/",
            {"code": "SAVE20"},
            format="json",
        )
        assert coupon_resp.status_code == status.HTTP_200_OK
        data = coupon_resp.json()
        assert data["data"]["coupon_code"] == "SAVE20"
        assert float(data["data"]["discount"]) == 999.00 * 0.2
        assert float(data["data"]["total"]) == 999.00 * 0.8

    def test_cart_checkout(self, api_client, student, course):
        api_client.force_authenticate(user=student)
        api_client.post("/api/v1/commerce/cart/add/", {"course_id": str(course.id)}, format="json")

        checkout_resp = api_client.post(
            "/api/v1/commerce/cart/checkout/",
            {"gateway": "razorpay"},
            format="json",
        )
        assert checkout_resp.status_code == status.HTTP_201_CREATED
        data = checkout_resp.json()
        assert data["status"] == "success"
        assert "order_id" in data["data"]
        assert data["data"]["gateway"] == "razorpay"
        assert float(data["data"]["amount"]) == 999.00

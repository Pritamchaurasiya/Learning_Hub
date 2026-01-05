"""Payment models."""

from django.db import models
from apps.users.models import User
from apps.courses.models import Course
from core.models import BaseModel


class Coupon(BaseModel):
    """Discount coupons."""

    code = models.CharField(max_length=20, unique=True)
    discount_percent = models.PositiveIntegerField()  # 0-100
    max_uses = models.PositiveIntegerField(null=True)
    used_count = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    courses = models.ManyToManyField(Course, blank=True)

    class Meta:
        db_table = "coupons"

    def __str__(self):
        return f"{self.code} ({self.discount_percent}%)"

    def is_valid(self):
        from django.utils import timezone

        now = timezone.now()
        return (
            self.is_active
            and self.valid_from <= now <= self.valid_until
            and (self.max_uses is None or self.used_count < self.max_uses)
        )


class Payment(BaseModel):
    """Payment transaction record."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    course = models.ForeignKey(Course, on_delete=models.SET_NULL, null=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    gateway = models.CharField(max_length=50)  # 'razorpay', 'stripe'
    gateway_order_id = models.CharField(max_length=100, blank=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True)

    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        course_title = self.course.title if self.course else "N/A"
        return f"{self.user.email} - {course_title} - {self.status}"

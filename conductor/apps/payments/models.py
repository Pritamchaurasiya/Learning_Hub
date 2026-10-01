from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import BaseModel

class Coupon(BaseModel):
    """
    Discount Coupons for payments.
    """
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    # Legacy field - kept for backwards compatibility
    expires_at = models.DateTimeField(null=True, blank=True)
    # Courses this coupon applies to (empty = all courses)
    courses = models.ManyToManyField('courses.Course', blank=True, related_name='coupons')
    
    def is_valid(self):
        now = timezone.now()
        # Check active status
        if not self.is_active:
            return False
        # Check valid_from/valid_until if set
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        # Check legacy expires_at
        if self.expires_at and now > self.expires_at:
            return False
        # Check max uses
        if self.max_uses and self.used_count >= self.max_uses:
            return False
        return True

    def __str__(self):
        return f"{self.code} - {self.discount_percent}%"

class Payment(BaseModel):
    """
    Payment transaction record.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Gateway info
    gateway = models.CharField(max_length=50) # 'razorpay', 'stripe'
    gateway_order_id = models.CharField(max_length=100, blank=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True)
    
    # Coupon
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['gateway_payment_id']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.amount} {self.currency} - {self.status}"


class Subscription(BaseModel):
    """
    User Subscription Plan (Pro, Enterprise).
    """
    class PlanType(models.TextChoices):
        PRO = 'pro', 'Pro Plan'
        ENTERPRISE = 'enterprise', 'Enterprise Plan'

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription')
    plan_type = models.CharField(max_length=20, choices=PlanType.choices, default=PlanType.PRO)
    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=True)
    
    # Gateway Subscription ID (if recurring)
    gateway_subscription_id = models.CharField(max_length=100, blank=True, null=True)

    def is_valid(self):
        if not self.is_active:
            return False
        if self.end_date is None:
            return True  # No expiry set means always valid
        return self.end_date > timezone.now()

    def __str__(self):
        return f"{self.user.email} - {self.plan_type}"


class Invoice(BaseModel):
    """Digital tax invoice generated for completed payments."""
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name='invoice')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invoices')
    billing_name = models.CharField(max_length=150, blank=True)
    billing_email = models.EmailField(blank=True)
    billing_address = models.TextField(blank=True)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to="invoices/", null=True, blank=True)

    class Meta:
        db_table = "payment_invoices"
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["user", "-issued_at"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} ({self.total_amount})"


class Cart(BaseModel):
    """
    Shopping cart for purchasing courses.
    Supports authenticated users and guest sessions.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="carts"
    )
    session_id = models.CharField(max_length=255, blank=True, db_index=True)
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carts"
    )

    class Meta:
        db_table = "payment_carts"
        ordering = ["-created_at"]

    def __str__(self):
        owner = self.user.email if self.user else f"Session {self.session_id}"
        return f"Cart {self.id} ({owner})"

    @property
    def total_items(self) -> int:
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self) -> float:
        total = sum(float(item.course.price or 0) * item.quantity for item in self.items.select_related('course'))
        return round(total, 2)

    @property
    def discount(self) -> float:
        if not self.coupon or not self.coupon.is_valid():
            return 0.0
        sub = self.subtotal
        disc = sub * (float(self.coupon.discount_percent) / 100.0)
        return round(disc, 2)

    @property
    def total(self) -> float:
        final_amt = max(0.0, self.subtotal - self.discount)
        return round(final_amt, 2)

    @property
    def currency(self) -> str:
        first_item = self.items.select_related('course').first()
        return getattr(first_item.course, 'currency', 'INR') if first_item and getattr(first_item, 'course', None) else 'INR'


class CartItem(BaseModel):
    """
    Individual course item inside a Cart.
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payment_cart_items"
        unique_together = [("cart", "course")]
        ordering = ["-added_at"]

    def __str__(self):
        return f"{self.course.title} x {self.quantity} in Cart {self.cart_id}"

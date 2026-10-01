import uuid
from django.db import models
from django.conf import settings
from apps.courses.models import Course

def generate_cart_id():
    return f"cart-{uuid.uuid4().hex[:8]}"

def generate_item_id():
    return f"item-{uuid.uuid4().hex[:8]}"

def generate_cert_id():
    return f"cert-{uuid.uuid4().hex[:8]}"

def generate_contest_id():
    return f"contest-{uuid.uuid4().hex[:8]}"

def generate_order_id():
    return f"ord-{uuid.uuid4().hex[:8]}"

def generate_order_item_id():
    return f"orditem-{uuid.uuid4().hex[:8]}"

def generate_txn_id():
    return f"txn-{uuid.uuid4().hex[:10]}"

class Coupon(models.Model):
    code = models.CharField(max_length=32, unique=True)
    discount_percent = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lh_coupons'

    def __str__(self):
        return f"{self.code} ({self.discount_percent}% OFF)"

class Cart(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_cart_id)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart', null=True, blank=True)
    session_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    applied_coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_carts'

    def recalculate(self):
        subtotal = 0.0
        for item in self.items.select_related('course').all():
            subtotal += float(item.course.price) * item.quantity
        discount = 0.0
        if self.applied_coupon and self.applied_coupon.is_active:
            discount = round(subtotal * (self.applied_coupon.discount_percent / 100.0), 2)
        total = max(0.0, round(subtotal - discount, 2))
        return {
            'subtotal': subtotal,
            'discount': discount,
            'total': total,
            'total_items': self.items.count()
        }

class CartItem(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_item_id)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    # Denormalized fields for API performance (match Node API contract)
    course_title = models.CharField(max_length=255, blank=True, default='')
    course_thumbnail = models.URLField(max_length=500, blank=True, null=True)
    instructor_name = models.CharField(max_length=150, blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_cart_items'

class Certificate(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_cert_id)
    certificate_code = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='certificates')
    title = models.CharField(max_length=255)
    signature = models.CharField(max_length=128)
    download_url = models.URLField(max_length=500)
    is_revoked = models.BooleanField(default=False)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_certificates'
        ordering = ['-issued_at']

    def __str__(self):
        return f"{self.certificate_code} - {self.title}"

class Web3Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='web3_profile')
    did = models.CharField(max_length=128, blank=True, default='')
    wallet_address = models.CharField(max_length=128, blank=True, default='0x0000000000000000000000000000000000000000')
    network = models.CharField(max_length=64, default='Polygon PoS')
    nft_certificates = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_web3_profiles'

class Contest(models.Model):
    STATUS_CHOICES = (
        ('upcoming', 'Upcoming'),
        ('active', 'Active'),
        ('completed', 'Completed'),
    )

    contest_id = models.CharField(primary_key=True, max_length=64, default=generate_contest_id)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration = models.IntegerField(default=120)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    participants = models.IntegerField(default=120)
    problem_count = models.IntegerField(default=4)
    prize = models.CharField(max_length=255, blank=True, default='₹50,000 Prize Pool')
    difficulty = models.CharField(max_length=32, default='medium')

    class Meta:
        db_table = 'lh_contests'
        ordering = ['-start_time']

class Order(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
    )
    id = models.CharField(primary_key=True, max_length=64, default=generate_order_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    subtotal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    payment_method = models.CharField(max_length=64, default='SIMULATED_CARD')
    # SECURITY: Idempotency key prevents duplicate orders on retry/click-twice
    idempotency_key = models.CharField(max_length=128, blank=True, default='', db_index=True)
    # SECURITY: Webhook signature for payment confirmation
    webhook_received_at = models.DateTimeField(null=True, blank=True)
    # Payment gateway fields (for Stripe/Razorpay integration)
    gateway_order_id = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    gateway_payment_id = models.CharField(max_length=128, blank=True, null=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'idempotency_key']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.id} - {self.user.email} (₹{self.total_amount})"

class OrderItem(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_order_item_id)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)

    class Meta:
        db_table = 'lh_order_items'

class PaymentTransaction(models.Model):
    STATUS_CHOICES = (
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('PENDING', 'Pending'),
    )
    id = models.CharField(primary_key=True, max_length=64, default=generate_txn_id)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    gateway_reference = models.CharField(max_length=128, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_payment_transactions'
        ordering = ['-created_at']

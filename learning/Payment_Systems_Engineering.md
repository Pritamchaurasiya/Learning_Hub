# 💰 PAYMENT SYSTEMS & E-COMMERCE ENGINEERING

## Building Secure, Scalable Payment Infrastructure

---

## 📋 TABLE OF CONTENTS

1. [Payment Architecture](#-payment-architecture)
2. [Security Fundamentals](#-security-fundamentals)
3. [Payment Gateway Integration](#-payment-gateway-integration)
4. [Transaction Lifecycle](#-transaction-lifecycle)
5. [Fraud Prevention](#-fraud-prevention)
6. [PCI DSS Compliance](#-pci-dss-compliance)
7. [Subscription & Recurring Payments](#-subscription--recurring-payments)
8. [Error Handling & Recovery](#-error-handling--recovery)

---

## 🏗️ PAYMENT ARCHITECTURE

### High-Level Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────►│   Backend    │────►│   Gateway    │
│  (Flutter)   │     │  (Django)    │     │ (Razorpay)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │  1. Create Order   │                    │
       │───────────────────►│  2. Init Order     │
       │                    │───────────────────►│
       │                    │   Order ID         │
       │   Order Details    │◄───────────────────│
       │◄───────────────────│                    │
       │                    │                    │
       │  3. Payment UI     │                    │
       │═══════════════════════════════════════►│
       │                    │   4. Process       │
       │   5. Response      │                    │
       │◄══════════════════════════════════════│
       │                    │                    │
       │  6. Verify         │  7. Confirm        │
       │───────────────────►│───────────────────►│
       │                    │   Signature        │
       │   8. Success       │◄───────────────────│
       │◄───────────────────│                    │
```

### Our Implementation

```python
# payments/views.py
class CreateOrderView(generics.GenericAPIView):
    def post(self, request):
        # 1. Validate course exists
        course = Course.objects.get(id=course_id, is_published=True)

        # 2. Check not already enrolled
        if Enrollment.objects.filter(user=request.user, course=course).exists():
            return Response({"error": "Already enrolled"}, status=400)

        # 3. Apply coupon if provided
        amount = course.price
        if coupon_code:
            discount = calculate_discount(coupon_code, amount)
            amount -= discount

        # 4. Create payment record (PENDING)
        payment = Payment.objects.create(
            user=request.user,
            course=course,
            amount=amount,
            status="pending"
        )

        # 5. Create gateway order
        # razorpay_order = client.order.create({...})

        return Response({
            "payment_id": payment.id,
            "amount": amount,
            "gateway_order_id": razorpay_order['id']
        })
```

---

## 🔒 SECURITY FUNDAMENTALS

### Never Handle Raw Card Data

```python
# ❌ NEVER DO THIS
def process_payment(card_number, cvv, expiry):
    # You're now liable for PCI DSS Level 1 compliance
    pass

# ✅ ALWAYS USE TOKENIZATION
def process_payment(gateway_token):
    # Gateway handles card, you handle token
    client.payment.capture(gateway_token, amount)
```

### Webhook Security

```python
import hmac
import hashlib

def verify_webhook(request):
    """Verify webhook signature from payment gateway."""
    payload = request.body
    signature = request.headers.get('X-Razorpay-Signature')
    secret = settings.RAZORPAY_WEBHOOK_SECRET

    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise SecurityException("Invalid webhook signature")
```

### Idempotency

```python
# Prevent duplicate charges
class CreateOrderView(generics.GenericAPIView):
    def post(self, request):
        idempotency_key = request.headers.get('Idempotency-Key')

        # Check if we've seen this request before
        cached = cache.get(f"payment:{idempotency_key}")
        if cached:
            return Response(cached)  # Return same response

        # Process payment...

        # Cache for 24 hours
        cache.set(f"payment:{idempotency_key}", response_data, 86400)
        return Response(response_data)
```

---

## 🔌 PAYMENT GATEWAY INTEGRATION

### Razorpay (India)

```python
import razorpay

client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))

# Create Order
order = client.order.create({
    "amount": 50000,  # Paise (₹500)
    "currency": "INR",
    "receipt": f"order_{payment_id}",
    "notes": {
        "user_id": str(user.id),
        "course_id": str(course.id)
    }
})

# Verify Signature
def verify_payment(payment_id, order_id, signature):
    params = {
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    }
    return client.utility.verify_payment_signature(params)
```

### Stripe (Global)

```python
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

# Create PaymentIntent
intent = stripe.PaymentIntent.create(
    amount=5000,  # Cents ($50)
    currency="usd",
    metadata={
        "user_id": str(user.id),
        "course_id": str(course.id)
    }
)

# Webhooks
@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig = request.META['HTTP_STRIPE_SIGNATURE']

    event = stripe.Webhook.construct_event(
        payload, sig, settings.STRIPE_WEBHOOK_SECRET
    )

    if event['type'] == 'payment_intent.succeeded':
        handle_successful_payment(event['data']['object'])
```

---

## 🔄 TRANSACTION LIFECYCLE

### State Machine

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ CREATED │────►│ PENDING │────►│ SUCCESS │
└─────────┘     └────┬────┘     └─────────┘
                     │
                     ▼
              ┌─────────────┐
              │   FAILED    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   REFUNDED  │
              └─────────────┘
```

### Implementation

```python
class Payment(BaseModel):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED
    )

    def can_transition_to(self, new_status):
        """Enforce valid state transitions."""
        valid_transitions = {
            self.Status.CREATED: [self.Status.PENDING],
            self.Status.PENDING: [self.Status.COMPLETED, self.Status.FAILED],
            self.Status.COMPLETED: [self.Status.REFUNDED],
            self.Status.FAILED: [],
            self.Status.REFUNDED: [],
        }
        return new_status in valid_transitions.get(self.status, [])
```

---

## 🛡️ FRAUD PREVENTION

### Risk Signals

| Signal      | Description                  | Action             |
| ----------- | ---------------------------- | ------------------ |
| Velocity    | Many attempts in short time  | Rate limit         |
| Mismatch    | Billing/IP country differs   | Flag for review    |
| VPN/Proxy   | Payment from anonymous IP    | Extra verification |
| New Account | First payment on new account | Lower limits       |
| High Value  | Transaction above threshold  | Manual review      |

### Implementation

```python
class FraudChecker:
    def check(self, payment, request):
        score = 0

        # Velocity check
        recent = Payment.objects.filter(
            user=payment.user,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        if recent > 5:
            score += 30

        # IP geolocation mismatch
        user_country = payment.user.country
        ip_country = get_country_from_ip(request.META['REMOTE_ADDR'])
        if user_country != ip_country:
            score += 20

        # New account
        if payment.user.created_at > timezone.now() - timedelta(days=7):
            score += 15

        # High value
        if payment.amount > 10000:  # ₹10,000
            score += 10

        return {
            'score': score,
            'action': 'block' if score > 50 else 'review' if score > 30 else 'allow'
        }
```

---

## 📋 PCI DSS COMPLIANCE

### Compliance Levels

| Level | Annual Transactions | Requirements                    |
| ----- | ------------------- | ------------------------------- |
| 1     | >6 million          | On-site audit + quarterly scans |
| 2     | 1-6 million         | SAQ + quarterly scans           |
| 3     | 20K-1M              | SAQ + quarterly scans           |
| 4     | <20K                | SAQ recommended                 |

### Key Requirements (Simplified)

1. **Never store CVV** - Not even encrypted
2. **Encrypt card data** - AES-256 at rest, TLS in transit
3. **Access controls** - Least privilege
4. **Audit logs** - Who accessed what, when
5. **Vulnerability scans** - Quarterly
6. **Penetration testing** - Annual

### Minimizing Scope

```
┌─────────────────────────────────────────────────────┐
│              PCI DSS Scope Reduction                │
│                                                     │
│  ┌──────────┐  tokenize  ┌──────────────────────┐  │
│  │ Customer │───────────►│ Payment Gateway     │  │
│  │ Browser  │◄───────────│ (Razorpay/Stripe)   │  │
│  └──────────┘   token    └──────────────────────┘  │
│       │                            │               │
│       │ token                      │ webhook       │
│       ▼                            ▼               │
│  ┌─────────────────────────────────────────────┐  │
│  │             Your Server                      │  │
│  │         (Token only - no card data)          │  │
│  │         Minimal PCI scope!                    │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔁 SUBSCRIPTION & RECURRING PAYMENTS

### Model Design

```python
class Subscription(BaseModel):
    class Interval(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)

    status = models.CharField(max_length=20)  # active, canceled, past_due
    interval = models.CharField(max_length=20, choices=Interval.choices)

    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)

    gateway_subscription_id = models.CharField(max_length=255)
```

### Billing Cycle Task

```python
# tasks.py
@shared_task
def process_subscription_renewals():
    """Run daily to process due subscriptions."""
    due_subscriptions = Subscription.objects.filter(
        status='active',
        current_period_end__lte=timezone.now(),
        cancel_at_period_end=False
    )

    for sub in due_subscriptions:
        try:
            # Charge via gateway
            charge_subscription(sub)

            # Extend period
            sub.current_period_start = sub.current_period_end
            sub.current_period_end += get_interval_duration(sub.interval)
            sub.save()

        except PaymentFailed:
            sub.status = 'past_due'
            sub.save()
            send_payment_failed_notification(sub.user)
```

---

## ⚠️ ERROR HANDLING & RECOVERY

### Common Errors

| Error              | Cause               | Recovery                  |
| ------------------ | ------------------- | ------------------------- |
| Insufficient Funds | Low balance         | Suggest different method  |
| Card Declined      | Bank rejection      | Retry with different card |
| 3DS Failed         | Auth failed         | Retry 3DS flow            |
| Network Timeout    | Gateway unreachable | Retry with backoff        |
| Duplicate          | Already processed   | Return cached response    |

### Retry Strategy

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def capture_payment(payment_id, amount):
    """Retry payment capture with exponential backoff."""
    return gateway.capture(payment_id, amount)

# Usage
try:
    result = capture_payment(payment.gateway_id, payment.amount)
except Exception as e:
    payment.status = 'failed'
    payment.error_message = str(e)
    payment.save()
    raise
```

### Reconciliation

```python
@shared_task
def reconcile_payments():
    """Daily reconciliation with gateway."""
    yesterday = timezone.now().date() - timedelta(days=1)

    # Get our records
    our_payments = Payment.objects.filter(
        created_at__date=yesterday,
        status='completed'
    )

    # Get gateway records
    gateway_payments = gateway.list_payments(date=yesterday)

    # Compare
    for gp in gateway_payments:
        try:
            our = our_payments.get(gateway_payment_id=gp['id'])
            if our.amount != gp['amount']:
                alert_discrepancy(our, gp)
        except Payment.DoesNotExist:
            alert_missing_payment(gp)
```

---

## 💎 PAYMENT GOLDEN RULES

1. **Never touch raw card data** - Use tokenization
2. **Always verify webhooks** - Check signatures
3. **Idempotency keys** - Prevent duplicate charges
4. **State machine** - Enforce valid transitions
5. **Reconcile daily** - Match with gateway
6. **Log everything** - Audit trail is critical
7. **Handle failures gracefully** - Retry with backoff

---

**SINGULARITY ENGINE v16.0**  
_"Money is serious. Treat payment code accordingly."_

# Payments 101: Taking Money (Safely)

**Course Instructor:** Antigravity AI
**Level:** Backend Architecture
**Topic:** Razorpay/Stripe Integration & Transaction Security

---

## Module 1: The Golden Rule

**NEVER trust the Client.**

- A user can edit the JavaScript to say they paid ₹1,000 when they only paid ₹1.
- **Solution:** Server-Side Verification.

---

## Module 2: The Flow (2-Step Architecture)

### Step 1: Intent (Server)

User clicks "Buy Course".

1.  Server calls Razorpay: "I want to create an order for ₹500."
2.  Razorpay says: "Okay, here is Order ID `order_123`."
3.  Server saves `Payment(status='pending', order_id='order_123')` in DB.

### Step 2: Execution (Client)

Flutter App opens the Razorpay SDK with `order_123`.
User pays via UPI/Card.

### Step 3: Verification (Server)

Razorpay gives the App a `signature`. The App sends this to the Server.

1.  Server re-calculates the HMAC-SHA256 signature using the Secret Key.
2.  If it matches -> **Mark as Paid** -> **Enroll User**.
3.  If not -> **Ban User** (Fraud attempt).

---

## Module 3: Security Deep Dive (`PaymentService`)

We implemented `verify_payment` in `apps/payments/services.py`.

```python
client.utility.verify_payment_signature({
    'razorpay_order_id': payment_id,
    'razorpay_payment_id': gateway_payment_id,
    'razorpay_signature': gateway_signature
})
```

This single line protects you from millions in losses. It proves the payment actually happened on Razorpay's server.

---

## Assignment

1.  Review `apps/payments/services.py`.
2.  **Challenge:** Implement a Webhook handler (`apps/payments/webhooks.py`) to handle cases where the app crashes _after_ payment but _before_ verification. (Hint: Razorpay calls your server automatically).

_Class Dismissed. Cash checks._

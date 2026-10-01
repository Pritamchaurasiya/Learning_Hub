# LearningHub — Canonical Payment & Ecommerce Contract

This document defines the **single source of truth** for the payment/ecommerce domain.

## Goals

1. **Server-computed totals** — client never controls final amount
2. **Idempotent orders** — same request = same order, no duplicates
3. **Webhook signature verification** — only trusted payment gateways can confirm
4. **PCI compliance** — no card data stored in DB
5. **Atomic state transitions** — PENDING → COMPLETED only via webhook

## Critical Security Rules

### Rule 1: Server-Computes All Amounts

**NEVER trust client-supplied prices.** Even if the frontend says "Pay ₹999", the backend must:
1. Look up the course price from the DB
2. Recalculate cart subtotal
3. Apply coupon (if any)
4. Compute final total

**Anti-pattern (was in Node `createOrder`):**
```typescript
const amount = cart?.total ?? (typeof req.body.amount === 'number' ? req.body.amount : 0)  // ❌ BUG
```

**Correct pattern:**
```typescript
const amount = cartService.computeTotal(userId)  // ✅ Server-computed
```

### Rule 2: Idempotency Keys

**Every order creation MUST accept an idempotency key.**

- Client sends: `X-Idempotency-Key: <uuid>` header OR `idempotency_key` body field
- Server checks: existing order with same key within 24h?
- If yes: return existing order (don't create duplicate)
- If no: create new order, store key

**Why?** User clicks "Pay" twice, network retry, mobile app backgrounded — without idempotency, you get duplicate charges.

### Rule 3: Webhook Signature Verification

**NEVER trust webhook payloads without signature verification.**

- Gateway sends: `X-Webhook-Signature: <hmac>` header
- Server computes: `HMAC-SHA256(webhook_secret, raw_body)`
- Compare signatures with `hmac.compare_digest()` (constant time)

**Without signature verification:** Attacker can POST fake "payment successful" and get free courses.

### Rule 4: Status Transitions

**Orders MUST go through these states only:**

```
PENDING → COMPLETED (via webhook)
PENDING → FAILED (via webhook or timeout)
COMPLETED → REFUNDED (admin action)
```

**NEVER:** PENDING → COMPLETED in the same request as order creation. Always wait for webhook.

### Rule 5: PCI Compliance

**NEVER store:**
- Card numbers (PAN)
- CVV/CVC
- Card expiration
- Cardholder name
- Track data
- PIN/PIN block

**Store only:**
- Gateway transaction ID
- Last 4 digits (optional, for display)
- Card brand (Visa, Mastercard, etc.)
- Gateway token for future charges

## Endpoints (Canonical)

### `POST /api/v1/cart`

**Add item to cart** — server looks up course price.

**Request:**
```json
{ "course_id": "course-123", "quantity": 1 }
```

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "items": [{ "course_id": "course-123", "title": "...", "price": 999, "quantity": 1 }],
    "subtotal": 999,
    "discount": 0,
    "total": 999,
    "currency": "INR"
  }
}
```

### `POST /api/v1/checkout` or `POST /api/v1/payments/orders`

**Create order with idempotency.**

**Request:**
```json
{
  "idempotency_key": "uuid-v4-here",
  "payment_method": "CARD"  // or "UPI", "NETBANKING", etc.
}
```

**Response 201 (new order):**
```json
{
  "status": "success",
  "data": {
    "order": {
      "id": "ord-123",
      "total_amount": 999,
      "status": "PENDING",
      "payment_method": "CARD"
    },
    "idempotent_replay": false
  },
  "message": "Order created. Awaiting payment confirmation."
}
```

**Response 200 (idempotent replay):**
```json
{
  "status": "success",
  "data": {
    "order": { ... existing order ... },
    "idempotent_replay": true
  },
  "message": "Order already exists (idempotent replay)"
}
```

### `POST /api/v1/webhooks/payment`

**Webhook from payment gateway** (Stripe/Razorpay/etc.)

**Headers required:**
- `Stripe-Signature: t=...,v1=...` (Stripe)
- OR `X-Razorpay-Signature: ...` (Razorpay)
- OR `X-Webhook-Signature: ...` (generic)

**Request body:** Gateway-specific event payload

**Response 200:**
```json
{ "status": "success", "data": { "received": true } }
```

**SECURITY:** 400 if signature is invalid. 404 if order not found.

## Production Reality Check (canonical — read before assuming "gate-ready")

- **No real money moves in this codebase.** Neither backend has a live payment-gateway SDK wired (see matrix rows: Stripe SDK = ❌/❌ TODO, refund flow = TODO, subscription state machine = TODO).
- Django's `PaymentWebhookView` (+ `/webhooks/payment`, `/webhooks/stripe`, `/webhooks/razorpay`) verifies HMAC-SHA256 signatures and transitions `PENDING → COMPLETED`, but there is **no live Stripe/Razorpay account, no SDK charge call, and no settlement** — it is gate-*shaped*, not gate-*live*.
- "Gate-ready" in older docs means *contract-shaped* (idempotency + server-computed totals + signed webhooks), **not** "ready to take customer cards." Cycle 13 (real Stripe integration) is still open — see EXECUTIVE_SUMMARY "What Remains".

## Implementation Matrix

| Concern | Node Backend | Django Backend | Status |
|---------|--------------|----------------|--------|
| Server-computed total | ✅ FIXED in this cycle | ✅ Already correct | ALIGNED |
| Idempotency key | ✅ FIXED in this cycle | ✅ FIXED in this cycle | ALIGNED |
| Status PENDING → COMPLETED | ✅ FIXED (no auto-complete) | ✅ FIXED (no auto-complete) | ALIGNED |
| Webhook signature verification | ⚠️ TODO (no webhook endpoint) | ✅ FIXED in this cycle | PARTIAL |
| Coupon re-validation at checkout | ⚠️ TODO | ✅ FIXED in this cycle | PARTIAL |
| Order persistence | ✅ FIXED in this cycle | ✅ Already correct | ALIGNED |
| Server-computed amount in createOrder | ✅ FIXED in this cycle | ✅ Already correct | ALIGNED |
| Cart recalc from server prices | ⚠️ TODO check | ✅ Already correct (recalculate method) | PARTIAL |
| Stripe SDK integration | ❌ Not present | ❌ Not present | TODO |
| Webhook handler endpoint | ❌ Not present | ✅ ADDED in this cycle | DJANGO BETTER |
| Refund flow | ❌ Not present | ❌ Not present | TODO |
| Subscription state atomic transitions | ❌ Not present | ❌ Not present | TODO |

## Anti-Cheat Patterns Applied

1. **No client-supplied amounts** — server computes from DB prices
2. **Idempotency keys** — prevents duplicate charges
3. **Webhook signature verification** — prevents fake payment confirmations
4. **PENDING → COMPLETED via webhook only** — no auto-complete
5. **Coupon re-validation at checkout** — prevents expired coupon abuse
6. **Order amount must match cart** — backend ignores client amount
7. **Atomic transactions** — order + items + transaction created together

## Attack Scenarios Prevented

| Attack | Mitigation |
|--------|------------|
| **Client sets `amount: 0` in checkout** | Server ignores client amount, uses cart total |
| **Click "Pay" twice → 2 orders** | Idempotency key |
| **Fake "payment success" webhook** | Signature verification |
| **Expired coupon still applied** | Re-validate at checkout time |
| **Race condition: cart changes during recalc** | Atomic transaction |
| **Replay old webhook → double-enroll** | Idempotency key + order status check |

## Migration Path

Phase 1 (DONE in this cycle):
- Fix Node `createOrder` to ignore client amount, use server-computed total
- Add idempotency key to Node `createOrder`
- Persist orders in Node DB with idempotency key
- Fix Django `CheckoutView` to require idempotency key
- Change Django order status from `COMPLETED` to `PENDING` (must wait for webhook)
- Don't auto-enroll on PENDING order (wait for webhook)
- Add Django `PaymentWebhookView` with HMAC signature verification
- Add webhook URL routes
- Add `idempotency_key` and `webhook_received_at` to Django `Order` model
- Re-validate coupon at Django checkout
- Document canonical payment contract

Phase 2 (TODO):
- Add Stripe SDK integration to Node
- Add Razorpay SDK integration to Node
- Implement actual webhook handlers in Node
- Add payment method selection UI flow
- Implement subscription state machine
- Add refund flow
- Add payment analytics

## PCI Compliance Notes

- Use Stripe Elements / Razorpay Checkout (frontend) — never handle card data
- All sensitive card operations go through gateway SDK
- Server never sees PAN, CVV, or full card details
- Webhook secrets stored in env vars, never in code
- Webhook signatures verified with HMAC-SHA256 constant-time compare

## Related Documentation

- `CANONICAL_AUTH_CONTRACT.md` — Auth token handling
- `ANTI_CHEAT_TIMER.md` — Anti-cheat patterns
- `CANONICAL_GAMIFICATION_CONTRACT.md` — XP/badges

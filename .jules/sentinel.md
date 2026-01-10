## 2026-01-10 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Authentication endpoints (Login, Register, Password Reset) lacked rate limiting, making them vulnerable to brute-force attacks and Denial of Service (DoS).
**Learning:** Default Django REST Framework settings do not imply rate limiting; it must be explicitly configured and applied to views.
**Prevention:** Always check `throttle_classes` or `throttle_scope` on public-facing endpoints and verify `DEFAULT_THROTTLE_RATES` in settings.

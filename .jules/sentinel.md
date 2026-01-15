## 2024-05-22 - [Auth Endpoint Rate Limiting Gap]
**Vulnerability:** Authentication endpoints (`login`, `register`) were exposed with `AllowAny` permissions but lacked specific rate limiting, relying on global defaults (which were also missing).
**Learning:** Django REST Framework does not apply throttling by default unless configured. Explicit `throttle_classes` and `throttle_scope` are needed for public-facing high-risk endpoints.
**Prevention:** Always define `throttle_scope` for authentication views and ensure `DEFAULT_THROTTLE_RATES` covers them.

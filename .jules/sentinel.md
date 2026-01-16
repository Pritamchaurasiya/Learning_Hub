## 2024-05-24 - [Auth Rate Limiting]
**Vulnerability:** Authentication endpoints (`login`, `register`, `password-reset`) were missing rate limiting, allowing for brute-force attacks and email enumeration.
**Learning:** Even though Django REST Framework has throttling classes, they are not enabled by default and must be explicitly configured in `settings` and applied to views. `ScopedRateThrottle` is particularly useful for applying shared limits across specific views (like all auth views sharing a "5/min" bucket). Global limits should be avoided or carefully tuned to avoid regression.
**Prevention:** Always configure `DEFAULT_THROTTLE_CLASSES` in `REST_FRAMEWORK` settings and audit public endpoints for abuse potential. Use `throttle_scope` for sensitive groups of endpoints.

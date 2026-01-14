## 2026-01-14 - [Missing Rate Limiting on Auth Endpoints]
**Vulnerability:** The authentication endpoints (`register`, `login`, `password-reset`, `confirm`) were missing explicit rate limiting, allowing potential brute-force attacks and denial-of-service.
**Learning:** Even if `django-rest-framework` is used, default throttling classes might not be active unless explicitly configured in `DEFAULT_THROTTLE_CLASSES`. `ScopedRateThrottle` is a powerful tool for targeted protection without affecting the entire API.
**Prevention:** Always verify `DEFAULT_THROTTLE_RATES` and `DEFAULT_THROTTLE_CLASSES` in `settings.py`. For sensitive endpoints, explicitly define `throttle_classes` and `throttle_scope` in the view to enforce limits regardless of global defaults.

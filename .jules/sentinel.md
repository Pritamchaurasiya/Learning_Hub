## 2026-01-28 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Authentication endpoints (`login`, `register`, `password-reset`) were not rate-limited, allowing for potential brute-force and DoS attacks. The `REST_FRAMEWORK` configuration lacked `DEFAULT_THROTTLE_CLASSES`.
**Learning:** Default Django REST Framework settings do not include throttling. It must be explicitly configured. Sensitive endpoints often get overlooked when focusing on functionality.
**Prevention:** Always define `DEFAULT_THROTTLE_CLASSES` in `settings.py` with safe defaults. Use `ScopedRateThrottle` for specific high-risk endpoints like authentication.

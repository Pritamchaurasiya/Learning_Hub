## 2024-05-24 - Rate Limiting on Authentication Endpoints
**Vulnerability:** Authentication endpoints (`login`, `register`, `password-reset`) were missing rate limiting, allowing for potential brute-force and credential stuffing attacks.
**Learning:** Default Django REST Framework settings often prioritize development ease over security. Throttling must be explicitly configured for sensitive endpoints.
**Prevention:** Use `ScopedRateThrottle` for specific sensitive views and define appropriate rates in `DEFAULT_THROTTLE_RATES`.

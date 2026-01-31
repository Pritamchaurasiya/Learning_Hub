## 2024-05-23 - [Missing Rate Limiting on Auth Endpoints]
**Vulnerability:** Authentication endpoints (Login, Register, etc.) lacked rate limiting, allowing for brute-force and credential stuffing attacks.
**Learning:** `ScopedRateThrottle` was not configured in `DEFAULT_THROTTLE_CLASSES`, and views lacked `throttle_scope`.
**Prevention:** Always define a default throttle class in DRF settings or explicitly set `throttle_classes` on sensitive views. Ensure `throttle_scope` is set when using `ScopedRateThrottle`.

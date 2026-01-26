## 2026-01-26 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Authentication endpoints (login, register) were completely unprotected from brute-force attacks due to missing throttling configuration.
**Learning:** DRF's `DEFAULT_THROTTLE_CLASSES` was not configured in `settings.base.py`, and views did not define `throttle_scope`. This suggests a manual configuration was missed during initial setup or refactoring.
**Prevention:** Always enforce a default throttle policy in `REST_FRAMEWORK` settings and use integration tests to verify that 429s are triggered on sensitive endpoints.

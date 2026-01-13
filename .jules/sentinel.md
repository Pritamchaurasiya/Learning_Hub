## 2026-01-13 - [Missing Auth Throttling]
**Vulnerability:** Authentication endpoints (login, register, password reset) were completely unthrottled, allowing for brute-force attacks, despite documentation/memory suggesting otherwise.
**Learning:** Do not rely on project memory or documentation for security controls; always verify implementation in code. `DEFAULT_THROTTLE_RATES` must be explicitly set in DRF settings.
**Prevention:** Implement `ScopedRateThrottle` on all public-facing authentication views and ensure `DEFAULT_THROTTLE_RATES` includes the scope. Added regression tests to `conductor/apps/users/tests/test_throttling.py`.

## 2026-02-03 - [Missing Rate Limiting on Auth Endpoints]
**Vulnerability:** Critical authentication endpoints (Login, Register, Password Reset) lacked rate limiting, exposing the system to brute-force and DoS attacks.
**Learning:** Django REST Framework's `ScopedRateThrottle` allows granular control but requires both global settings (`DEFAULT_THROTTLE_RATES`) and view-level attributes (`throttle_scope`). Integration tests sharing a process/cache can unintentionally hit these limits if state isn't cleared.
**Prevention:** Implement `ScopedRateThrottle` for all sensitive public-facing endpoints and ensure test suites include cache clearing fixtures to isolate tests.

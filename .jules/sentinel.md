## 2026-01-18 - [Missing Default Throttle Configuration]
**Vulnerability:** Sensitive authentication endpoints (Login, Register, Password Reset) were completely unrestricted, allowing unlimited brute force attempts.
**Learning:** Although memory/documentation suggested `ScopedRateThrottle` was used, it was missing from `REST_FRAMEWORK` settings in `base.py`, leaving the API unprotected.
**Prevention:** Always verify that security settings (throttling, permissions) defined in documentation are actually present in the codebase configuration.

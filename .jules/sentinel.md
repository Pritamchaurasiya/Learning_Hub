## 2024-05-22 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** The `RegisterView`, `LoginView`, and other authentication endpoints lacked any `throttle_classes`, allowing unlimited attempts (brute force, credential stuffing, DoS).
**Learning:** Although `ScopedRateThrottle` was mentioned in project documentation as being "default", it was not actually configured in `settings.py` nor applied to the views. Assumptions based on documentation must always be verified against code.
**Prevention:** Implement defensive defaults. Configure `DEFAULT_THROTTLE_CLASSES` and `DEFAULT_THROTTLE_RATES` in `settings.py` so that even if a view forgets to define throttles, it falls back to a safe default. Explicitly audit high-risk endpoints like Auth for specific, tighter controls.

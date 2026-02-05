## 2026-02-05 - [Missing Default Throttling]
**Vulnerability:** The Django REST Framework configuration lacked `DEFAULT_THROTTLE_RATES` and `throttle_classes` on authentication views, despite documentation/memory suggesting otherwise. This left login/register endpoints exposed to brute-force attacks.
**Learning:** Configuration defaults in memory or documentation are not a substitute for explicit code verification. The test suite also failed to catch this because tests share the same environment and cache wasn't cleared between them, masking statefulness issues.
**Prevention:** Explicitly define `DEFAULT_THROTTLE_RATES` in `settings.py` and ensure `ScopedRateThrottle` is applied to sensitive views. Use `autouse=True` fixtures to clear cache in tests to prevent cross-test contamination.

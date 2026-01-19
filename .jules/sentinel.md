## 2024-05-24 - [Auth Throttling Implementation]
**Vulnerability:** Authentication endpoints (Login, Register, Password Reset) lacked rate limiting, exposing them to brute-force attacks.
**Learning:** Adding global throttling (e.g., `AnonRateThrottle`) can inadvertently block legitimate users if the rate is too low (e.g., `100/day`). Scoped throttling is safer for targeted protection.
**Prevention:** Use `ScopedRateThrottle` for specific sensitive endpoints and define strict limits (e.g., `5/min`) only for those scopes.

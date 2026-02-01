## 2026-02-01 - [Rate Limiting and Scope Creep]
**Vulnerability:** Authentication endpoints lacked rate limiting, allowing brute-force attacks.
**Learning:** Fixing security issues sometimes reveals broken environments (missing dependencies like `celery`). Adding missing dependencies can be seen as "harmful changes" or scope creep in a focused security PR.
**Prevention:** Focus strictly on the security fix. If the environment is broken, document it or fix it in a separate PR, but do not mix dependency fixes (especially major ones like Celery) with security patches unless absolutely necessary for the fix itself.

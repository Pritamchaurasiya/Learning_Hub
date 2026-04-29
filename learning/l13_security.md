## 🛡️ Lesson 13: Security Hardening (Zero Trust)

**Status**: COMPLETED

### 🔐 Trust No One (Not Even Yourself)

Default settings are insecure. We must assume the attacker is already inside.

### 🛑 Content Security Policy (CSP)

- **Problem**: XSS (Cross Site Scripting). Attacker injects `<script>steal_cookies()</script>`.
- **Solution**: `CSP_SCRIPT_SRC = ("'self'", ...)`
- **Effect**: The browser _refuses_ to load scripts from unknown domains.

### 🔒 HTTP Strict Transport Security (HSTS)

- **Problem**: User types `http://api.com`. Hacker intercepts the plain text.
- **Solution**: Server sends `Strict-Transport-Security`.
- **Effect**: Browser _automatically_ converts http:// to https:// for the next year.

### 🕵️ Dependency Scanning (Snyk)

- **Problem**: Using an old version of `Pillow` with a known vulnerability.
- **Solution**: CI Pipeline runs `snyk test`.
- **Effect**: Build FAILS if we use insecure libraries.

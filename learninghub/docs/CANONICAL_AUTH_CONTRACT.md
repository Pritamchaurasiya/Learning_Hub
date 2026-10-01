# LearningHub — Canonical Authentication API Contract

This document defines the **single source of truth** for the authentication API contract that both backends (Node/Express and Django REST) must implement and the frontend must consume.

## Goals

1. Frontend works against either backend without conditional code.
2. Both backends can be swapped via environment configuration.
3. New token formats (camelCase OR snake_case) are accepted on input.
4. Response always includes tokens in **both** body AND httpOnly cookies (cookie-first defense in depth).

## Canonical Response Format

All auth responses follow this envelope:

```json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "Human-readable message",
  "meta": { ... }   // optional, for pagination etc.
  "code": "ERROR_CODE"  // optional, on error
}
```

`data` for auth endpoints MUST include the canonical token shape:

```json
{
  "user": { "id": "...", "email": "...", "username": "...", "role": "STUDENT" },
  "token": "eyJ...",                     // canonical access token (preferred)
  "accessToken": "eyJ...",               // alias
  "refreshToken": "eyJ...",              // canonical refresh token
  "tokens": {                            // alternative structured form
    "access": "eyJ...",
    "refresh": "eyJ...",
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

## Endpoints

### `POST /api/v1/auth/login`

**Request:**
```json
{ "email": "user@example.com", "password": "StrongPass123!" }
```

**Response 200 (success, no MFA):**
```json
{
  "status": "success",
  "data": {
    "user": { "id": "...", "email": "...", "role": "STUDENT", ... },
    "token": "...",
    "accessToken": "...",
    "refreshToken": "...",
    "tokens": { "access": "...", "refresh": "..." }
  },
  "message": "Login successful"
}
```

**Response 200 (MFA required):**
```json
{
  "status": "success",
  "data": { "mfaRequired": true, "userId": "...", "mfaSessionToken": "..." },
  "message": "MFA verification required"
}
```

**Set-Cookie headers (always, when success):**
- `access_token=...; HttpOnly; Path=/; Max-Age=900; SameSite=Strict`
- `refresh_token=...; HttpOnly; Path=/api/v1/auth; Max-Age=604800; SameSite=Strict`

### `POST /api/v1/auth/register`

**Request:**
```json
{ "email": "new@example.com", "password": "StrongPass123!", "username": "optional" }
```

**Response 201:**
Same as login success.

### `POST /api/v1/auth/refresh`

**Request (any of these field names accepted):**
```json
{ "refreshToken": "..." }
// OR
{ "refresh": "..." }
// OR
{ "refresh_token": "..." }
```

If no body field, fallback to `refresh_token` httpOnly cookie.

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "message": "Token refreshed",
    "token": "...",
    "accessToken": "...",
    "refreshToken": "..."
  },
  "message": "Token refreshed"
}
```

Also sets new `access_token` and `refresh_token` cookies.

### `POST /api/v1/auth/logout`

**Request:** (optional refresh token in body or cookie)

**Response 200:**
```json
{ "status": "success", "data": null, "message": "Logged out successfully" }
```

Clears auth cookies.

### `GET /api/v1/auth/me`

**Request:** Bearer token in Authorization header OR `access_token` cookie.

**Response 200:**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "email": "...",
    "username": "...",
    "role": "STUDENT",
    "xp": 0,
    "level": 1,
    "streak": 0,
    "lastActive": "..."
  }
}
```

## Frontend Behavior

The frontend (`src/utils/api.ts`) will:

1. **Read tokens from body first** (primary), fall back to SecureStorage
2. **Send `refreshToken` (camelCase)** as the canonical field name on refresh
3. **Send `Authorization: Bearer <token>`** header from the access token
4. **Persist tokens in SecureStorage** (not localStorage for XSS resistance)
5. **Dispatch `auth:token-refreshed`** event after successful refresh
6. **Dispatch `auth:session-expired`** event when refresh fails — triggers logout

## Backend Implementation Matrix

| Endpoint | Node Backend | Django Backend | Status |
|----------|--------------|----------------|--------|
| POST /auth/login | ✅ Returns user + tokens in body, sets cookies | ✅ Returns user + tokens in body | ALIGNED |
| POST /auth/register | ✅ Returns user + tokens in body, sets cookies | ✅ Returns user + tokens in body | ALIGNED |
| POST /auth/refresh | ✅ Accepts refresh_token/refresh/**refreshToken**, returns tokens in body, sets cookies | ✅ Accepts refresh/refreshToken, returns tokens in body | ALIGNED |
| POST /auth/logout | ✅ Clears cookies | ⚠️ Returns success but no token blacklist (TODO) | PARTIAL |
| GET /auth/me | ✅ Returns full user | ✅ Returns user | ALIGNED |
| POST /auth/mfa/setup | ✅ Returns secret + QR | ✅ Returns secret + QR URL | ALIGNED |
| POST /auth/mfa/verify-enable | ✅ Enables MFA | ⚠️ VerifyMfaView exists but differs (TODO align) | PARTIAL |
| POST /auth/mfa/verify-login | ✅ Returns tokens on MFA success | ⚠️ Not seen in views.py (TODO) | MISSING IN DJANGO |

## Security Requirements

1. **Token Storage:**
   - Backend: httpOnly cookies (defense in depth)
   - Frontend: SecureStorage (XSS-resistant client storage)

2. **Token Lifetime (Canonical Reality — Intentional Divergence):**
    - Node: 15 min (`backend/src/utils/cookies.ts:54` — `COOKIE_ACCESS.maxAge = 15 * 60 * 1000` / `Set-Cookie Max-Age=900`)
    - Django: 60 min (`django_backend/learninghub_server/settings.py:191` — `SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] = timedelta(minutes=60)`)
    - Refresh: 7 days both (`backend/src/utils/cookies.ts:34` — `7 * 24 * 60 * 60 * 1000`; `django_backend/learninghub_server/settings.py:192` — `timedelta(days=7)`)
    - Recommendation: align to 15min in future — requires coordinated rollout (do not change without migration plan)

3. **CSRF:**
   - Mutating requests require `X-CSRF-Token` header (matches cookie value)
   - Node: explicit csrfMiddleware
   - Django: built-in CsrfViewMiddleware (Django 5.x automatic)

4. **Rate Limiting:**
   - Login: 5/min (already enforced)
   - Refresh: 10/min (recommended)
   - Register: 3/min (recommended)

5. **Token Blacklist:**
   - Both backends: enabled after rotation (SimpleJWT BLACKLIST_AFTER_ROTATION=True)

## Migration Path

Phase 1 (DONE in this cycle): Align Node backend to canonical contract.
Phase 2 (TODO): Verify Django backend matches all fields.
Phase 3 (TODO): Add integration tests for both backends.
Phase 4 (TODO): Switch frontend to backend via `VITE_API_TARGET` env var.
Phase 5 (TODO): Decommission Node backend after full parity proven.

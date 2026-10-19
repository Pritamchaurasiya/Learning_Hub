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
  "token": "eyJ...", // canonical access token (preferred)
  "accessToken": "eyJ...", // alias
  "refreshToken": "eyJ...", // canonical refresh token
  "tokens": {
    // alternative structured form
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

## Frontend Behavior (Cycle 21+)

The frontend (`src/utils/api.ts`) now uses **httpOnly cookies exclusively**:

1. **No localStorage/token storage** — tokens are NOT stored in frontend memory or localStorage
2. **httpOnly cookies set by backend** — `access_token` and `refresh_token` cookies set via `Set-Cookie` headers
3. **Automatic cookie transmission** — `credentials: 'include'` on all `fetchApi` calls
4. **No Authorization header needed** — backend reads from httpOnly cookies (defense in depth)
5. **Refresh flow** — `POST /auth/refresh` with `credentials: 'include'` returns new cookies
6. **WebSocket auth** — in-memory token for WS connections only (`src/services/examStationWebSocketService.ts`)

### Legacy (Pre-Cycle 21) — Removed

- ~~SecureStorage for XSS-resistant client storage~~ (REMOVED — httpOnly cookies are superior)
- ~~Authorization header from localStorage token~~ (REMOVED — cookie auto-transmit)
- ~~`auth:token-refreshed` / `auth:session-expired` events for token management~~ (still dispatched for UI sync)

### AuthSlice (`src/stores/slices/authSlice.ts`)

- `setAuth()` — sets authenticated user state only (tokens from cookies)
- `logout()` — calls `/auth/logout`, clears cookies, clears in-memory WS token
- `fetchMe()` — validates session via `/auth/me`

## Backend Implementation Matrix

| Endpoint                     | Node Backend                                                                            | Django Backend                                          | Status            |
| ---------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------- |
| POST /auth/login             | ✅ Returns user + tokens in body, sets cookies                                          | ✅ Returns user + tokens in body                        | ALIGNED           |
| POST /auth/register          | ✅ Returns user + tokens in body, sets cookies                                          | ✅ Returns user + tokens in body                        | ALIGNED           |
| POST /auth/refresh           | ✅ Accepts refresh_token/refresh/**refreshToken**, returns tokens in body, sets cookies | ✅ Accepts refresh/refreshToken, returns tokens in body | ALIGNED           |
| POST /auth/logout            | ✅ Clears cookies                                                                       | ⚠️ Returns success but no token blacklist (TODO)        | PARTIAL           |
| GET /auth/me                 | ✅ Returns full user                                                                    | ✅ Returns user                                         | ALIGNED           |
| POST /auth/mfa/setup         | ✅ Returns secret + QR                                                                  | ✅ Returns secret + QR URL                              | ALIGNED           |
| POST /auth/mfa/verify-enable | ✅ Enables MFA                                                                          | ⚠️ VerifyMfaView exists but differs (TODO align)        | PARTIAL           |
| POST /auth/mfa/verify-login  | ✅ Returns tokens on MFA success                                                        | ⚠️ Not seen in views.py (TODO)                          | MISSING IN DJANGO |

## Security Requirements (Cycle 21+)

1. **Token Storage — httpOnly Cookie Only:**
   - **Backend:** Sets httpOnly cookies on login/register/refresh (`setAuthCookies`)
   - **Frontend:** **NO token storage** — reads auth state from `/auth/me` response only
   - **WebSocket:** In-memory token for WS connection handshake only (not persisted)

2. **Token Lifetime (Canonical Reality — Intentional Divergence):**
   - Node: 15 min access (`backend/src/utils/cookies.ts:54` — `COOKIE_ACCESS.maxAge = 15 * 60 * 1000` / `Set-Cookie Max-Age=900`)
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
   - Node: refresh token rotation with `usedAt` timestamp in DB

6. **XSS Protection:**
   - httpOnly cookies prevent token theft via XSS
   - CSP headers via Helmet (no `unsafe-inline` in production)
   - DOMPurify for user-generated HTML
   - Input sanitization on both ends (control chars, event handlers, javascript: protocol)

## Migration Path

**Phase 0 — COMPLETE (Cycle 21):** httpOnly cookie migration for frontend

- Removed SecureStorage/localStorage token storage
- Frontend uses `credentials: 'include'` + httpOnly cookies
- WebSocket auth uses in-memory token

**Phase 1 — COMPLETE (Cycle 18-20):** Align Node backend to canonical contract.

**Phase 2 (TODO):** Verify Django backend matches all fields.

**Phase 3 (TODO):** Add integration tests for both backends.

**Phase 4 (TODO):** Switch frontend to backend via `VITE_API_TARGET` env var.

**Phase 5 (TODO):** Decommission Node backend after full parity proven.

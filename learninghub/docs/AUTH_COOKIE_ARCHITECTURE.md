# LearningHub — httpOnly Cookie Authentication Architecture (Cycle 21+)

## Overview

Cycle 21 migrated the frontend from encrypted localStorage (`SecureStorage`) to **httpOnly cookies** for JWT token storage. This eliminates the XSS vulnerability where any successful XSS could read the encryption salt + ciphertext and attempt offline decryption.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐     POST /auth/login      ┌──────────┐
│ Frontend │ ───────────────────────▶ │ Backend  │
│ (React)  │  credentials: 'include'  │ (Node)   │
└──────────┘                           └────┬─────┘
                                             │
                                    ┌────────▼────────┐
                                    │ Set-Cookie:     │
                                    │ access_token=...│
                                    │   HttpOnly      │
                                    │   Path=/        │
                                    │   Max-Age=900   │
                                    │   SameSite=Strict│
                                    │                 │
                                    │ refresh_token=..│
                                    │   HttpOnly      │
                                    │   Path=/api/    │
                                    │   Max-Age=604800│
                                    │   SameSite=Strict│
                                    └────────┬────────┘
                                             │
┌──────────┐     200 + Set-Cookie      ┌────▼─────┐
│ Frontend │ ◀──────────────────────── │ Backend  │
│ (React)  │  Body: { user, tokens }  │ (Node)   │
└──────────┘                           └──────────┘
     │
     │ Browser auto-stores httpOnly cookies
     │ Frontend reads user from response body
     │ NO tokens stored in localStorage/memory
     ▼
┌──────────┐     GET /api/v1/...      ┌──────────┐
│ Frontend │ ───────────────────────▶ │ Backend  │
│ (React)  │  credentials: 'include'  │ (Node)   │
└──────────┘   Cookie: access_token   └────┬─────┘
                                             │
                                    ┌────────▼────────┐
                                    │ authMiddleware  │
                                    │ reads from      │
                                    │ req.cookies     │
                                    └─────────────────┘
```

## Key Files

| File                                          | Purpose                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `backend/src/utils/cookies.ts`                | `setAuthCookies`, `clearAuthCookies`, `getAccessTokenFromCookie`        |
| `backend/src/middleware/authMiddleware.ts`    | Reads token from httpOnly cookie (preferred) or Authorization header    |
| `src/utils/api.ts`                            | `fetchApi` with `credentials: 'include'`; no Authorization header logic |
| `src/stores/slices/authSlice.ts`              | `setAuth` (user state only), `logout` (clears cookies + WS token)       |
| `src/services/examStationWebSocketService.ts` | In-memory token for WS handshake only                                   |
| `src/pages/AuthPage.tsx`                      | Sets WS token on login success                                          |

## Cookie Configuration

| Cookie  | Name            | Path           | Max-Age      | HttpOnly | SameSite |
| ------- | --------------- | -------------- | ------------ | -------- | -------- |
| Access  | `access_token`  | `/`            | 900s (15min) | Yes      | Strict   |
| Refresh | `refresh_token` | `/api/v1/auth` | 604800s (7d) | Yes      | Strict   |

## Security Properties

| Threat            | Mitigation                                             |
| ----------------- | ------------------------------------------------------ |
| XSS token theft   | **httpOnly cookies** — JavaScript cannot read cookies  |
| CSRF              | Double-submit: `X-CSRF-Token` header + SameSite=Strict |
| Token replay      | Short access token (15min), rotation on refresh        |
| MITM              | `Secure` flag in production (HTTPS only)               |
| Subdomain leakage | SameSite=Strict + explicit Path                        |

## Frontend Changes (Cycle 21)

### Removed

- `SecureStorage` class usage for auth tokens
- `localStorage`/`sessionStorage` token reads/writes
- `Authorization: Bearer` header injection in `fetchApi`
- Manual `setAccessToken`/`setRefreshToken` calls

### Added

- `getCookie()` helper for reading non-httpOnly cookies (CSRF, etc.)
- `clearTokens()` expires cookies + clears legacy localStorage keys
- `setWsAuthToken()`/`getWsAuthToken()`/`clearWsAuthToken()` for WS

### Unchanged

- CSRF token handling (stored in readable cookie + memory)
- `credentials: 'include'` on all fetch calls
- `auth:session-expired` / `auth:token-refreshed` events for UI sync

## Token Refresh Flow

```typescript
// Frontend: POST /auth/refresh (called automatically on 401)
await fetchApi('/auth/refresh', { method: 'POST' })

// Backend: validates refresh_token cookie, rotates both tokens
// Returns 200 + Set-Cookie: new access_token + new refresh_token
// Browser auto-stores new cookies
// Frontend retries original request (cookies now valid)
```

## WebSocket Authentication

WebSockets cannot use httpOnly cookies during handshake reliably. Solution:

1. **On login:** Store access token in memory (`setWsAuthToken`)
2. **On connect:** Include token as query param `?token=<accessToken>`
3. **Backend:** Validates token from query param (or cookie if available)
4. **On logout:** Clear in-memory token (`clearWsAuthToken`)

## Testing

```bash
# Verify cookies are httpOnly
curl -v https://api.learninghub.com/api/v1/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# Should show:
# Set-Cookie: access_token=...; HttpOnly; Path=/; Max-Age=900; SameSite=Strict
# Set-Cookie: refresh_token=...; HttpOnly; Path=/api/v1/auth; Max-Age=604800; SameSite=Strict

# Verify subsequent requests include cookies
curl -v -b cookies.txt https://api.learninghub.com/api/v1/auth/me
```

## Migration Notes

- **No breaking changes to API contract** — backend still returns tokens in body for mobile/legacy clients
- **Frontend ignores body tokens** — uses cookies exclusively
- **Django backend parity:** Django also sets httpOnly cookies (verify `SIMPLE_JWT` config)
- **Rollback:** Revert `src/utils/api.ts` to SecureStorage version if needed

## Related Documents

- [CANONICAL_AUTH_CONTRACT.md](./CANONICAL_AUTH_CONTRACT.md) — Full API contract
- [SECURITY.md](./SECURITY.md) — Overall security posture
- [MONITORING.md](./MONITORING.md) — Health/metrics endpoints

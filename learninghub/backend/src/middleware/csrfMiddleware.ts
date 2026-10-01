import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { sendError, sendSuccess } from '../utils/responseHelper'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const CSRF_SECRET = (() => {
  const secret = process.env.CSRF_SECRET
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CSRF_SECRET must be set and at least 32 characters long. ' +
          "Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
      )
    }
    // In development, auto-generate a random secret to prevent startup crashes
    const generated = crypto.randomBytes(48).toString('hex')
    console.warn(
      '[CSRF] WARNING: CSRF_SECRET not set or too short. Auto-generated for development. ' +
        'Set CSRF_SECRET in your .env file for consistent CSRF tokens across restarts.'
    )
    return generated
  }
  return secret
})()

/**
 * Generate a stateless HMAC signed CSRF token
 * Format: base64(sessionId.expiresAt.hmac(sessionId + expiresAt))
 */
export async function generateCsrfTokenForSession(sessionId: string): Promise<string> {
  const expiresAt = Date.now() + CSRF_TOKEN_TTL_MS
  const payload = `${sessionId}.${expiresAt}`
  const hmac = crypto.createHmac('sha256', CSRF_SECRET).update(payload).digest('hex')
  const token = Buffer.from(`${payload}.${hmac}`).toString('base64url')
  return token
}

/**
 * Stateless CSRF Protection Middleware
 *
 * DESIGN NOTES / TRADEOFFS (P0 documented, behaviour preserved for compat):
 * - The `x-session-id` value is currently client-controlled (persisted in
 *   localStorage by the SPA). This binds the HMAC token to a per-tab identifier
 *   but does NOT prove server-side session ownership on its own. The HMAC secret
 *   still prevents forgery, and auth still requires the httpOnly access cookie /
 *   Bearer token. Preferred hardening (future): server generates the session id
 *   on login (`POST /auth/login` → Set-Cookie `sid` HttpOnly + return id), store
 *   it in `userSession.sessionToken`, and accept ONLY that value here.
 * - No `csrf-token` cookie is issued by this service; the token is returned as
 *   JSON (`GET /api/v1/csrf-token`) and echoed via `x-csrf-token`. If a cookie
 *   variant is ever added for double-submit, it MUST be readable by JS
 *   (`httpOnly: false` — required so the SPA can echo it) with
 *   `SameSite=Strict; Secure (prod); Path=/api/v1`, short TTL, and the HMAC
 *   check below must still run server-side. Readability is the accepted
 *   tradeoff; secrecy comes from the HMAC secret, not the cookie.
 * - Exemptions are intentionally minimal: safe methods, `/webhook/*`
 *   (HMAC-signed by the payment provider, not browser-cookie auth), and the
 *   pre-authentication endpoints below (no session exists yet). `/logout` and
 *   `/refresh` are NOT exempt to block forced-logout / token-refresh CSRF.
 */
export async function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    next()
    return
  }

  if (req.originalUrl.includes('/webhook')) {
    next()
    return
  }

  const normalizedPath = req.originalUrl.split('?')[0].replace(/\/+$/, '')
  if (
    normalizedPath.match(
      /^\/api\/v1\/(auth\/(login|register|forgot-password|reset-password|verify-email|mfa\/verify-login)|admin\/auth\/(login|verify-mfa|register\/initial))$/
    )
  ) {
    // CSRF exemption: Pre-authentication endpoints before an active session token is established.
    // /logout is intentionally excluded — requires CSRF token to prevent forced logout attacks.
    // /refresh is intentionally excluded — requires CSRF token to prevent token theft via CSRF.
    next()
    return
  }

  const sessionId = req.headers['x-session-id'] as string | undefined
  if (!sessionId) {
    sendError(res, 'Missing session identifier', 403, 'CSRF_MISSING_SESSION')
    return
  }

  const clientToken = req.headers[CSRF_HEADER] as string | undefined

  if (!clientToken) {
    sendError(res, 'Missing CSRF token', 403, 'CSRF_MISSING_TOKEN')
    return
  }

  try {
    const decoded = Buffer.from(clientToken, 'base64url').toString('utf-8')
    const parts = decoded.split('.')

    if (parts.length !== 3) {
      sendError(res, 'Invalid CSRF token format', 403, 'CSRF_INVALID_TOKEN')
      return
    }

    const [tokenSessionId, tokenExpiresAt, tokenHmac] = parts

    const tokenSessionBuf = Buffer.from(tokenSessionId)
    const sessionBuf = Buffer.from(sessionId)

    if (
      tokenSessionBuf.length !== sessionBuf.length ||
      !crypto.timingSafeEqual(tokenSessionBuf, sessionBuf)
    ) {
      sendError(res, 'CSRF token does not match session', 403, 'CSRF_SESSION_MISMATCH')
      return
    }

    // Verify expiration
    if (parseInt(tokenExpiresAt, 10) < Date.now()) {
      sendError(res, 'CSRF token expired', 403, 'CSRF_TOKEN_EXPIRED')
      return
    }

    // Verify HMAC signature (length-safe comparison)
    const expectedPayload = `${tokenSessionId}.${tokenExpiresAt}`
    const expectedHmac = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(expectedPayload)
      .digest('hex')

    const tokenBuf = Buffer.from(tokenHmac)
    const expectedBuf = Buffer.from(expectedHmac)

    if (tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      sendError(res, 'Invalid CSRF token signature', 403, 'CSRF_INVALID_SIGNATURE')
      return
    }

    next()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    sendError(res, 'Malformed CSRF token', 403, 'CSRF_MALFORMED_TOKEN')
    return
  }
}

export async function csrfTokenHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['x-session-id'] as string
  if (!sessionId) {
    sendError(res, 'Missing session identifier', 400, 'CSRF_MISSING_SESSION')
    return
  }

  const token = await generateCsrfTokenForSession(sessionId)
  sendSuccess(res, { csrfToken: token })
}

export async function getCsrfTokenForSession(sessionId: string): Promise<string | undefined> {
  return generateCsrfTokenForSession(sessionId)
}

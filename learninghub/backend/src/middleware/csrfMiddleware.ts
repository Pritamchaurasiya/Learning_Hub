import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { sendError } from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'

const CSRF_TOKEN_LENGTH = 32
const CSRF_HEADER = 'x-csrf-token'
const CSRF_TOKEN_TTL = 24 * 60 * 60 // 24 hours in seconds

// In-memory fallback store (used when Redis unavailable)
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>()

function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

function getCsrfToken(req: Request): string | undefined {
  const headerToken = req.headers[CSRF_HEADER]
  if (typeof headerToken === 'string') {
    return headerToken
  }
  return req.body?.[CSRF_HEADER] as string | undefined
}

async function storeCsrfToken(sessionId: string, token: string): Promise<void> {
  const key = `csrf:${sessionId}`
  if (cacheService.isAvailable()) {
    await cacheService.set(key, token, CSRF_TOKEN_TTL)
  } else {
    csrfTokenStore.set(sessionId, {
      token,
      expiresAt: Date.now() + CSRF_TOKEN_TTL * 1000,
    })
  }
}

async function getStoredCsrfToken(sessionId: string): Promise<string | null> {
  const key = `csrf:${sessionId}`

  if (cacheService.isAvailable()) {
    return await cacheService.get<string>(key)
  }

  const stored = csrfTokenStore.get(sessionId)
  if (!stored || stored.expiresAt < Date.now()) {
    csrfTokenStore.delete(sessionId)
    return null
  }

  return stored.token
}

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

  if (
    req.originalUrl.match(
      /^\/api\/v1\/auth\/(login|register|forgot-password|reset-password|verify-email|refresh|logout)/
    )
  ) {
    // CSRF exemption: These endpoints use body-based refresh tokens
    // If switching to cookie-based auth, this exemption should be removed
    next()
    return
  }

  const sessionId = req.headers['x-session-id'] as string | undefined
  if (!sessionId) {
    sendError(res, 'Missing session identifier', 403, 'CSRF_MISSING_SESSION')
    return
  }

  const clientToken = getCsrfToken(req)
  if (!clientToken) {
    sendError(res, 'Missing CSRF token', 403, 'CSRF_MISSING_TOKEN')
    return
  }

  const storedToken = await getStoredCsrfToken(sessionId)
  if (!storedToken) {
    sendError(res, 'Invalid or expired CSRF token', 403, 'CSRF_INVALID_TOKEN')
    return
  }

  const storedBuffer = Buffer.from(storedToken)
  const clientBuffer = Buffer.from(clientToken)
  if (
    storedBuffer.length !== clientBuffer.length ||
    !crypto.timingSafeEqual(storedBuffer, clientBuffer)
  ) {
    sendError(res, 'Invalid CSRF token', 403, 'CSRF_INVALID_TOKEN')
    return
  }

  next()
}

export async function generateCsrfTokenForSession(sessionId: string): Promise<string> {
  const token = generateCsrfToken()
  await storeCsrfToken(sessionId, token)
  return token
}

export async function getCsrfTokenForSession(sessionId: string): Promise<string | undefined> {
  const token = await getStoredCsrfToken(sessionId)
  return token ?? undefined
}

// Cleanup in-memory tokens every 30 minutes (only runs if Redis unavailable)
const csrfCleanupInterval = setInterval(
  () => {
    const now = Date.now()
    for (const [sessionId, data] of csrfTokenStore.entries()) {
      if (data.expiresAt < now) {
        csrfTokenStore.delete(sessionId)
      }
    }
  },
  30 * 60 * 1000
)
csrfCleanupInterval.unref()

export function stopCsrfCleanup(): void {
  clearInterval(csrfCleanupInterval)
  csrfTokenStore.clear()
}

export async function csrfTokenHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers['x-session-id'] as string
  if (!sessionId) {
    res.status(400).json({
      status: 'error',
      message: 'Missing session identifier',
      code: 'CSRF_MISSING_SESSION',
    })
    return
  }

  const token = await generateCsrfTokenForSession(sessionId)
  res.json({
    status: 'success',
    csrfToken: token,
  })
}

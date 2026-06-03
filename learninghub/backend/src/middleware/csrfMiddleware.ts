import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { sendError } from '../utils/responseHelper'

const CSRF_TOKEN_LENGTH = 32
const CSRF_HEADER = 'x-csrf-token'

// In-memory store for CSRF tokens (use Redis in production for multi-instance)
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

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    next()
    return
  }

  if (req.path.includes('/webhook')) {
    next()
    return
  }

  if (req.path.match(/^\/api\/v1\/auth\/(login|register|forgot-password|reset-password|verify-email)/)) {
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

  const stored = csrfTokenStore.get(sessionId)
  if (!stored || stored.expiresAt < Date.now()) {
    sendError(res, 'Invalid or expired CSRF token', 403, 'CSRF_INVALID_TOKEN')
    return
  }

  const storedBuffer = Buffer.from(stored.token)
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

export function generateCsrfTokenForSession(sessionId: string): string {
  const token = generateCsrfToken()
  csrfTokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  })
  return token
}

export function getCsrfTokenForSession(sessionId: string): string | undefined {
  const stored = csrfTokenStore.get(sessionId)
  if (!stored || stored.expiresAt < Date.now()) {
    return undefined
  }
  return stored.token
}

setInterval(() => {
  const now = Date.now()
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (data.expiresAt < now) {
      csrfTokenStore.delete(sessionId)
    }
  }
}, 30 * 60 * 1000).unref?.()

export function csrfTokenHandler(req: Request, res: Response): void {
  const sessionId = req.headers['x-session-id'] as string
  if (!sessionId) {
    res.status(400).json({
      status: 'error',
      message: 'Missing session identifier',
      code: 'CSRF_MISSING_SESSION',
    })
    return
  }

  const token = generateCsrfTokenForSession(sessionId)
  res.json({
    status: 'success',
    csrfToken: token,
  })
}

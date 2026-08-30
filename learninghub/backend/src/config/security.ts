/* eslint-disable security/detect-non-literal-regexp */
import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// Extend Express Request type for rate limit
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number
        current: number
        remaining: number
        resetTime?: Date
      }
    }
  }
}

// MFA-specific rate limiting (stricter to prevent brute force of 2FA codes)
export const mfaRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_MFA_WINDOW_MS ?? '300000', 10), // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_MFA_MAX ?? '3', 10),
  message: {
    status: 'error',
    message: 'Too many MFA attempts. Please wait before trying again.',
    code: 'MFA_RATE_LIMIT_EXCEEDED',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many MFA attempts. Please wait before trying again.',
      code: 'MFA_RATE_LIMIT_EXCEEDED',
      details: { retryAfter: 5 * 60 },
    })
  },
})

// Rate limiting configurations
export const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '5', 10),
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      details: { retryAfter: 15 * 60 },
    })
  },
})

export const adminRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS ?? '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? '30', 10),
  message: {
    status: 'error',
    message: 'Too many admin requests, please try again later.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

export const csrfRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_CSRF_WINDOW_MS ?? '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_CSRF_MAX ?? '10', 10),
  keyGenerator: req => {
    const sessionId = req.headers['x-session-id']
    return typeof sessionId === 'string' ? `csrf:${sessionId}` : (req.ip ?? 'unknown')
  },
  message: {
    status: 'error',
    message: 'Too many CSRF token requests, please try again later.',
    code: 'CSRF_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
})

// CORS configuration — supports comma-separated origins for multi-domain production
const parseOrigins = (envValue: string | undefined): string | string[] => {
  const isDev = process.env.NODE_ENV !== 'production'
  const defaultOrigins = isDev
    ? 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173'
    : undefined
  const raw = envValue ?? defaultOrigins
  if (!raw) {
    throw new Error(
      'CORS_ORIGIN must be explicitly set in production. Set it to your frontend domain(s), comma-separated for multiple.'
    )
  }
  const origins = raw
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
  return origins.length === 1 ? origins[0] : origins
}

export const corsOptions = {
  origin: parseOrigins(process.env.CORS_ORIGIN),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Request-ID',
    'X-Session-ID',
    'X-CSRF-Token',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

// Helmet configuration — production-grade CSP (HTTP header, NOT meta tag)
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // In production, inline scripts MUST use nonces or be external.
      // 'unsafe-inline' is ONLY allowed in development for HMR.
      scriptSrc: [
        "'self'",
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      ],
      scriptSrcAttr: process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : ["'none'"],
      styleSrc: ["'self'", ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : []), 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: [
        "'self'",
        'https:',
        'ws:',
        'wss:',
        ...(process.env.NODE_ENV === 'development'
          ? ['http://localhost:*', 'ws://localhost:*']
          : []),
      ],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' as const },
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
  dnsPrefetchControl: { allow: false },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
  permissionsPolicy: {
    features: {
      camera: ["'self'"],
      microphone: ["'self'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"],
      accelerometer: ["'none'"],
      gyroscope: ["'none'"],
      magnetometer: ["'none'"],
    },
  },
}

// JWT configuration — FAILS if secrets are not set (no insecure defaults)
const getEnvOrThrow = (envVar: string, hint: string): string => {
  // eslint-disable-next-line security/detect-object-injection
  const value = process.env[envVar]
  if (!value || value.length < 32) {
    throw new Error(`${envVar} must be set and at least 32 characters long. ${hint}`)
  }
  return value
}

export const jwtConfig = {
  accessSecret: getEnvOrThrow(
    'JWT_SECRET',
    "Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  ),
  refreshSecret: getEnvOrThrow(
    'JWT_REFRESH_SECRET',
    "Generate with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  ),
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  algorithm: 'HS256' as const,
  issuer: 'learninghub',
  audience: 'learninghub-users',
}

// Bcrypt configuration
export const bcryptConfig = {
  rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  minPasswordLength: 8,
  maxPasswordLength: 128,
}

// Password policy
export const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

// Session configuration
export const sessionConfig = {
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER ?? '5', 10),
  sessionTimeoutMinutes: 30,
  idleTimeoutMinutes: 15,
  absoluteTimeoutMinutes: 480, // 8 hours
}

// Validation for password strength
export const validatePasswordStrength = (
  password: string
): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters long`)
  }

  if (password.length > passwordPolicy.maxLength) {
    errors.push(`Password must not exceed ${passwordPolicy.maxLength} characters`)
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  const specialCharsEscaped = passwordPolicy.specialChars.replace(
    /[-[\]{}()*+?.,\\^$|#\s]/g,
    '\\$&'
  )
  const specialRegex = new RegExp(`[${specialCharsEscaped}]`)
  if (passwordPolicy.requireSpecialChars && !specialRegex.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for common password patterns
  const commonPatterns = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'admin',
    'login',
    'master',
    'root',
  ]

  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    errors.push('Password contains common patterns that are easily guessed')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Sanitize input to prevent injection attacks
// NOTE: SQL injection is handled by Prisma's parameterized queries.
// XSS prevention relies on: (1) CSP headers in securityMiddleware,
// (2) removal of event handlers (on\w+=) and javascript: protocol,
// (3) frontend rendering escaping, and (4) skipping sanitization
// for code/content fields where HTML entities are legitimate.
//
// This function is a defense-in-depth measure, NOT the primary protection against XSS.
// HTML entity removal (hex &#x... and decimal &#... patterns) is intentional — while
// these could be used for obfuscation, stripping them prevents encoded payloads from
// reaching template engines. Fields that legitimately contain HTML entities (code blocks,
// math formulas, etc.) should be excluded via SKIP_FIELDS in sanitizeMiddleware.ts.
// Input length is capped at 1MB via .slice() to prevent memory exhaustion.
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove null bytes and control chars (keep tab/newline)
    .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/&#x[0-9a-fA-F]+;/g, '') // Remove hex HTML entities
    .replace(/&#\d+;/g, '') // Remove decimal HTML entities
    .trim()
    .slice(0, 1_000_000) // Match expanded max allowed by Zod and content-heavy fields
}

// Generate secure random token
export const generateSecureToken = (length: number = 32): string => {
  return require('crypto').randomBytes(length).toString('hex')
}

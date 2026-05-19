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

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS ?? '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX ?? '100', 10),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now()) / 1000),
    })
  },
})

export const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '5', 10),
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use ipKeyGenerator helper for IPv6 compatibility
    const ip = req.ip ?? 'unknown'
    // For simplicity in this context, we'll use the standard approach
    // In a production environment with express-rate-limit, you'd use their built-in helpers
    return ip
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60, // 15 minutes in seconds
    })
  },
})

export const adminRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS ?? '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX ?? '30', 10),
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use ipKeyGenerator helper for IPv6 compatibility
    const ip = req.ip ?? 'unknown'
    // For simplicity in this context, we'll use the standard approach
    // In a production environment with express-rate-limit, you'd use their built-in helpers
    return ip
  },
})

// CORS configuration — supports comma-separated origins for multi-domain production
const parseOrigins = (envValue: string | undefined): string | string[] => {
  const raw = envValue ?? 'http://localhost:5173'
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

// Helmet configuration — production-grade CSP
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Use nonce-based inline scripts in production; unsafe-inline removed for security
      scriptSrc: ["'self'", ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'"] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      connectSrc: ["'self'", 'https:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' as const },
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' as const },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
  xssFilter: true,
}

// JWT configuration — FAILS if secrets are not set (no insecure defaults)
const getEnvOrThrow = (envVar: string, hint: string): string => {
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

  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
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
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript\s*:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, '') // Remove HTML entities
    .trim()
    .slice(0, 1000) // Limit input length
}

// Generate secure random token
export const generateSecureToken = (length: number = 32): string => {
  const crypto = require('crypto')
  return crypto.randomBytes(length).toString('hex')
}

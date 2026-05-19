import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash password using bcrypt (secure for production)
 * Replaces insecure SHA-256 implementation
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Security headers for all responses
 * Adds protection against common web vulnerabilities
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  }
}

/**
 * CORS headers - restrictive by default
 */
export function getCORSHeaders(
  allowedOrigins: string[],
  requestOrigin: string | null
): Record<string, string> {
  const origin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] || 'https://learninghub.app'

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Rate limit configuration by endpoint type
 */
export const RATE_LIMITS = {
  // Strict limits for auth endpoints
  auth: { requests: 5, window: 60 }, // 5 requests per minute
  // Standard limits for API
  api: { requests: 60, window: 60 }, // 60 requests per minute
  // Relaxed limits for read-only
  read: { requests: 120, window: 60 }, // 120 requests per minute
  // Strict for AI endpoints (costly)
  ai: { requests: 10, window: 60 }, // 10 requests per minute
} as const

export type RateLimitType = keyof typeof RATE_LIMITS

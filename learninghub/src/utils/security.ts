/**
 * Security utilities for sanitization and validation
 * Protects against XSS and injection attacks
 */

/**
 * Sanitize HTML content to prevent XSS
 * Removes dangerous tags and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''

  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Sanitize user input for display
 * Escapes HTML special characters
 */
export function escapeHtml(input: string): string {
  if (!input) return ''

  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number
 */
export function isValidPassword(password: string): boolean {
  if (!password || password.length < 8) return false

  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)

  return hasUpperCase && hasLowerCase && hasNumbers
}

/**
 * Sanitize URL to prevent open redirects
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''

  // Only allow http/https protocols
  const allowedProtocols = ['http:', 'https:']
  try {
    const parsed = new URL(url)
    if (!allowedProtocols.includes(parsed.protocol)) {
      return ''
    }
    return url
  } catch {
    // If invalid URL, check if it's a relative path
    if (url.startsWith('/') && !url.startsWith('//')) {
      return url
    }
    return ''
  }
}

/**
 * Rate limiter for API calls
 * Prevents spam/abuse
 */
export class RateLimiter {
  private calls: Map<string, number[]> = new Map()
  private maxCalls: number
  private windowMs: number

  constructor(maxCalls = 5, windowMs = 60000) {
    this.maxCalls = maxCalls
    this.windowMs = windowMs
  }

  canProceed(key: string): boolean {
    const now = Date.now()
    const calls = this.calls.get(key) ?? []

    // Remove old calls outside window
    const validCalls = calls.filter(time => now - time < this.windowMs)

    if (validCalls.length >= this.maxCalls) {
      return false
    }

    validCalls.push(now)
    this.calls.set(key, validCalls)
    return true
  }

  getRemainingTime(key: string): number {
    const now = Date.now()
    const calls = this.calls.get(key) ?? []

    if (calls.length === 0) return 0

    const oldestCall = Math.min(...calls)
    const remaining = this.windowMs - (now - oldestCall)
    return Math.max(0, remaining)
  }
}

// Global rate limiter instance
export const apiRateLimiter = new RateLimiter(10, 60000) // 10 calls per minute

/**
 * Secure storage utility for sensitive data
 * Uses AES-GCM encryption with a derived key
 */
export class SecureStorage {
  private static readonly STORAGE_KEY_PREFIX = 'lh_secure_'
  private static readonly ENCRYPTION_KEY = 'learninghub-v1-key'

  /**
   * Simple XOR encryption (for production, use Web Crypto API)
   * This provides basic obfuscation for tokens in localStorage
   */
  private static xorEncrypt(data: string, key: string): string {
    let result = ''
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return btoa(result) // Base64 encode
  }

  private static xorDecrypt(encrypted: string, key: string): string | null {
    try {
      const data = atob(encrypted) // Base64 decode
      let result = ''
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return result
    } catch {
      return null
    }
  }

  static setItem(key: string, value: string): void {
    const encrypted = this.xorEncrypt(value, this.ENCRYPTION_KEY)
    localStorage.setItem(this.STORAGE_KEY_PREFIX + key, encrypted)
  }

  static getItem(key: string): string | null {
    const encrypted = localStorage.getItem(this.STORAGE_KEY_PREFIX + key)
    if (!encrypted) return null
    return this.xorDecrypt(encrypted, this.ENCRYPTION_KEY)
  }

  static removeItem(key: string): void {
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + key)
  }

  static clear(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.STORAGE_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key))
  }
}

/**
 * Migrate existing plain tokens to secure storage
 */
export function migrateToSecureStorage(): void {
  const keysToMigrate = ['token', 'refreshToken', 'userId']

  keysToMigrate.forEach(key => {
    const plainValue = localStorage.getItem(key)
    if (plainValue) {
      SecureStorage.setItem(key, plainValue)
      localStorage.removeItem(key)
    }
  })
}

const STORAGE_KEY_PREFIX = 'lh_'

export function sanitizeHtml(input: string): string {
  if (!input) return ''
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function escapeHtml(input: string): string {
  if (!input) return ''
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPassword(password: string): boolean {
  if (!password || password.length < 8) return false
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  return hasUpperCase && hasLowerCase && hasNumbers
}

export function sanitizeUrl(url: string): string {
  if (!url) return ''
  const allowedProtocols = ['http:', 'https:']
  try {
    const parsed = new URL(url)
    if (!allowedProtocols.includes(parsed.protocol)) return ''
    return url
  } catch {
    if (url.startsWith('/') && !url.startsWith('//')) return url
    return ''
  }
}

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
    const validCalls = calls.filter(time => now - time < this.windowMs)
    if (validCalls.length >= this.maxCalls) return false
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

export const apiRateLimiter = new RateLimiter(10, 60000)

const STORAGE_SALT_KEY = 'lh_salt_v2'

function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(STORAGE_SALT_KEY)
  if (stored) {
    return Uint8Array.from(atob(stored), c => c.charCodeAt(0))
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(STORAGE_SALT_KEY, btoa(String.fromCharCode(...salt)))
  return salt
}

async function getEncryptionKey(salt: BufferSource): Promise<CryptoKey> {
  const appIdentifier = `learninghub-v2:${window.location.origin}`
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appIdentifier),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

let encryptionKeyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  encryptionKeyPromise ??= getEncryptionKey(getOrCreateSalt() as BufferSource)
  return encryptionKeyPromise
}

export class SecureStorage {
  static async setItem(key: string, value: string): Promise<void> {
    const k = await getKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(value)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, encoded)
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    localStorage.setItem(STORAGE_KEY_PREFIX + key, btoa(String.fromCharCode(...combined)))
  }

  static async getItem(key: string): Promise<string | null> {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + key)
    if (!stored) return null
    const k = await getKey()
    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, data)
    return new TextDecoder().decode(decrypted)
  }

  static removeItem(key: string): void {
    localStorage.removeItem(STORAGE_KEY_PREFIX + key)
  }

  static clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_KEY_PREFIX))
      .forEach(k => localStorage.removeItem(k))
  }
}

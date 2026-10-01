import {
  getCachedData,
  getInFlightRequest,
  getOfflineFallback,
  invalidateCache,
  isCacheable,
  setCachedData,
  trackInFlightRequest,
} from './cache'
import { SecureStorage } from './security'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  const msg = import.meta.env.PROD
    ? 'VITE_API_URL environment variable is required in production'
    : 'VITE_API_URL environment variable is not set. Create a .env file or set VITE_API_URL.'
  throw new Error(msg)
}

const TOKEN_KEY = 'lh_access_token'
const REFRESH_TOKEN_KEY = 'lh_refresh_token'

async function getAccessToken(): Promise<string | null> {
  try {
    const token = await SecureStorage.getItem(TOKEN_KEY)
    if (token) return token
    return await SecureStorage.getItem('token')
  } catch {
    return null
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    const token = await SecureStorage.getItem(REFRESH_TOKEN_KEY)
    if (token) return token
    return await SecureStorage.getItem('refreshToken')
  } catch {
    return null
  }
}

async function setAccessToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStorage.setItem(TOKEN_KEY, token)
    await SecureStorage.setItem('token', token)
  } else {
    SecureStorage.removeItem(TOKEN_KEY)
    SecureStorage.removeItem('token')
  }
}

async function setRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStorage.setItem(REFRESH_TOKEN_KEY, token)
    await SecureStorage.setItem('refreshToken', token)
  } else {
    SecureStorage.removeItem(REFRESH_TOKEN_KEY)
    SecureStorage.removeItem('refreshToken')
  }
}

async function clearTokens(): Promise<void> {
  SecureStorage.removeItem(TOKEN_KEY)
  SecureStorage.removeItem('token')
  SecureStorage.removeItem(REFRESH_TOKEN_KEY)
  SecureStorage.removeItem('refreshToken')
}

export { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens }

// Spec: MAX_RETRIES=1 at the fetch layer (single retry with exponential backoff).
// React Query `retry: 3` in main.tsx is a SEPARATE layer (UI/query retries) —
// intentional separation, not double-retry of the same layer. Do not raise this
// value without updating the spec; raising it reintroduces double-retry storms.
const RETRY_CONFIG = {
  maxRetries: 1, // spec MAX_RETRIES=1 — queryClient retry handles React Query layer separately, api handles fetch layer
  baseDelay: 1000,
  maxDelay: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504] as readonly number[],
}

// 30s per-attempt timeout applied via AbortController in executeWithTimeout.
// Every fetch path (initial request AND 401-refresh retry) must go through
// executeWithTimeout so timeout/abort chaining is never bypassed.
const REQUEST_TIMEOUT_MS = 30_000

function getDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  return Math.min(delay + Math.random() * 1000, RETRY_CONFIG.maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let csrfTokenMemory: string | null = null
let csrfTokenPromise: Promise<string | null> | null = null

export const getCsrfToken = (): string | null => {
  if (csrfTokenMemory) return csrfTokenMemory
  const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'))
  const token = match ? match[2] : null
  if (token) csrfTokenMemory = token
  return token
}

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Fallback if randomUUID fails or restricted
    }
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    } catch {
      // Fallback if getRandomValues fails
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('sessionId')
  if (!sessionId) {
    sessionId = generateUUID()
    localStorage.setItem('sessionId', sessionId)
  }
  return sessionId
}

export const setCsrfToken = (token: string): void => {
  csrfTokenMemory = token
  const secureSuffix = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `csrf-token=${token}; path=/; SameSite=Lax${secureSuffix}`
}

export const initCsrfToken = async (forceRefresh = false): Promise<string | null> => {
  if (!forceRefresh && getCsrfToken()) return getCsrfToken()

  // Use a proper mutex to prevent concurrent CSRF token fetches
  if (csrfTokenPromise) return csrfTokenPromise

  csrfTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/csrf-token`, {
        headers: { 'Content-Type': 'application/json', 'X-Session-ID': getSessionId() },
        credentials: 'include',
      })
      if (response.ok) {
        const body = await response.json()
        const csrfToken = body?.data?.csrfToken ?? body?.csrfToken
        if (csrfToken) {
          setCsrfToken(csrfToken)
          return csrfToken
        }
      } else if (import.meta.env.DEV) {
        console.warn('[API] CSRF token fetch failed:', response.status)
      }
      return null
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[API] CSRF token fetch failed — backend may not be running')
      }
      return null
    } finally {
      // Clear in-flight mutex so subsequent attempts can retry
      csrfTokenPromise = null
    }
  })()

  return csrfTokenPromise
}

// Client-side guard only: 200 req/min PER TAB (in-memory closure).
// NOTE (multi-tab limitation): each tab holds its own counter, so N open tabs
// can emit N×200 req/min. The authoritative limit is enforced server-side;
// this guard is best-effort burst protection, not a security boundary.
// A future improvement is BroadcastChannel/SharedWorker cross-tab counting,
// but server enforcement remains the source of truth.
// Atomic rate limiter using closure to prevent race conditions
const createRateLimiter = () => {
  let count = 0
  let windowStart = Date.now()
  return (): boolean => {
    const now = Date.now()
    if (now - windowStart > 60_000) {
      count = 0
      windowStart = now
    }
    count++
    if (count > 200) {
      if (import.meta.env.DEV) {
        console.warn('[API] Client rate limit exceeded (200 req/min)')
      }
      return true
    }
    return false
  }
}

const isRateLimited = createRateLimiter()

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 10_000)
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\beval\s*\(/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '')
    .replace(/<applet\b[^>]*>[\s\S]*?<\/applet>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/mocha\s*:/gi, '')
    .replace(/livescript\s*:/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
}

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const INVALIDATE_CACHE_EVENTS = [
  'auth:session-expired',
  'auth:logout',
  'user:profile-updated',
  'user:preferences-updated',
  'data:test-created',
  'data:test-updated',
  'data:test-deleted',
  'data:problem-created',
  'data:problem-updated',
  'data:problem-deleted',
  'data:course-created',
  'data:course-updated',
  'data:course-deleted',
  'data:enrollment-changed',
  'data:progress-updated',
  'data:bookmark-updated',
]
INVALIDATE_CACHE_EVENTS.forEach(event => {
  window.addEventListener(event, () => invalidateCache())
})

let tokenRefreshPromise: Promise<void> | null = null

const refreshAccessToken = async (): Promise<void> => {
  if (tokenRefreshPromise) return tokenRefreshPromise

  tokenRefreshPromise = (async () => {
    if (isRateLimited()) throw new Error('Too many requests. Please try again later.')

    const refreshToken = await getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    }
    let csrfToken = getCsrfToken()
    if (!csrfToken) {
      csrfToken = await initCsrfToken(false)
    }
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken

    // Timeout-guarded refresh: never use raw fetch without AbortController timeout.
    // Chains abort so a hung /auth/refresh cannot stall the 401-retry path forever.
    const refreshController = new AbortController()
    const refreshTimeoutId = setTimeout(() => refreshController.abort(), REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
        signal: refreshController.signal,
      })
    } finally {
      clearTimeout(refreshTimeoutId)
    }

    if (!response.ok) {
      await clearTokens()
      throw new Error('Token refresh failed')
    }

    const data = await response.json().catch(() => ({}))
    const newAccessToken =
      data?.data?.token ??
      data?.data?.accessToken ??
      data?.data?.access_token ??
      data?.token ??
      data?.access_token ??
      data?.access ??
      null
    const newRefreshToken =
      data?.data?.refreshToken ?? data?.data?.refresh ?? data?.refreshToken ?? data?.refresh ?? null

    if (newAccessToken) {
      await setAccessToken(newAccessToken)
    }
    if (newRefreshToken) {
      await setRefreshToken(newRefreshToken)
    }

    window.dispatchEvent(new CustomEvent('auth:token-refreshed'))
  })().finally(() => {
    tokenRefreshPromise = null
  })

  return tokenRefreshPromise
}

export interface FetchApiOptions extends RequestInit {
  responseType?: 'json' | 'blob'
  bypassCache?: boolean
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  message?: string
  data: T
  code?: string
  meta?: Record<string, unknown>
}

async function executeWithTimeout(
  fullUrl: string,
  options: RequestInit,
  headers: Headers
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // Chain caller's signal if provided, so timeout still applies
  const callerSignal = options.signal
  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort()
    } else {
      callerSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  try {
    return await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetchApi = async (endpoint: string, options: FetchApiOptions = {}): Promise<any> => {
  const responseType = options.responseType ?? 'json'
  const normalizedEndpoint =
    endpoint.endsWith('/') && endpoint.length > 1 ? endpoint.slice(0, -1) : endpoint
  const fullUrl = `${API_URL}${normalizedEndpoint}`
  const method = (options.method ?? 'GET').toUpperCase()

  if (responseType === 'json' && method === 'GET' && !options.bypassCache) {
    const cachedData = getCachedData(fullUrl, options)
    if (cachedData !== null) return cachedData

    if (!options.signal) {
      const inFlight = getInFlightRequest(fullUrl, options)
      if (inFlight !== null) return inFlight
    }

    if (!navigator.onLine) {
      const offlineData = getOfflineFallback(fullUrl, options)
      if (offlineData !== null) return offlineData
    }
  }

  if (isRateLimited()) throw new Error('Too many requests. Please slow down.')

  const headers = new Headers(options.headers ?? {})
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  headers.set('X-Session-ID', getSessionId())

  // Attach JWT access token if available
  const accessToken = await getAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      const token = await initCsrfToken(false)
      if (token) headers.set('X-CSRF-Token', token)
      // If still no CSRF token after init, log in dev but don't add header with null
    } else {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  const executeRequest = async (): Promise<unknown> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await executeWithTimeout(fullUrl, options, headers)

        if (response.ok) {
          if (responseType === 'blob') return response.blob()
          const data = await response.json()
          if (method === 'GET' && isCacheable(fullUrl, options) && !options.bypassCache)
            setCachedData(fullUrl, data, options)
          return data
        }

        const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method.toUpperCase())
        if (!isIdempotent || !RETRY_CONFIG.retryableStatuses.includes(response.status)) {
          return handleNonRetryable(
            response,
            fullUrl,
            options,
            responseType,
            method,
            normalizedEndpoint
          )
        }

        if (import.meta.env.DEV) {
          console.warn(
            `[API] Retryable ${response.status}, attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`
          )
        }
        if (attempt < RETRY_CONFIG.maxRetries) {
          await sleep(getDelay(attempt))
        } else {
          return handleNonRetryable(
            response,
            fullUrl,
            options,
            responseType,
            method,
            normalizedEndpoint
          )
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (
          lastError.name === 'AbortError' ||
          lastError.message.includes('AbortError') ||
          lastError.message.includes('Aborted')
        ) {
          throw lastError
        }

        if (import.meta.env.DEV) {
          console.warn(
            `[API] Network error, attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`,
            lastError
          )
        }
        if (attempt < RETRY_CONFIG.maxRetries) {
          await sleep(getDelay(attempt))
        }
      }
    }

    if (lastError) throw lastError
    throw new Error('Network error. Please check your connection.')
  }

  if (responseType === 'json' && method === 'GET' && !options.signal && !options.bypassCache) {
    return trackInFlightRequest(fullUrl, options, executeRequest())
  }

  return executeRequest()
}

async function handleNonRetryable(
  response: Response,
  fullUrl: string,
  options: FetchApiOptions,
  responseType: string,
  method: string,
  normalizedEndpoint: string
) {
  if (response.status === 401) {
    const isAuthEndpoint =
      normalizedEndpoint.includes('/auth/login') ||
      normalizedEndpoint.includes('/auth/register') ||
      normalizedEndpoint.includes('/auth/refresh')

    if (!isAuthEndpoint) {
      try {
        await refreshAccessToken()
        const headers = new Headers(options.headers ?? {})
        if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
        headers.set('X-Session-ID', getSessionId())
        const csrfToken = getCsrfToken()
        if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
        const newAccessToken = await getAccessToken()
        if (newAccessToken) headers.set('Authorization', `Bearer ${newAccessToken}`)

        // 401-refresh retry MUST reuse the timeout/abort pipeline (not raw fetch)
        // so REQUEST_TIMEOUT_MS and caller-signal chaining still apply.
        const retryResponse = await executeWithTimeout(
          fullUrl,
          { ...options, headers },
          headers
        )

        if (retryResponse.ok) {
          if (responseType === 'blob') return retryResponse.blob()
          const data = await retryResponse.json()
          if (method === 'GET' && isCacheable(fullUrl, options))
            setCachedData(fullUrl, data, options)
          return data
        }
        response = retryResponse
      } catch {
        await clearTokens()
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', { detail: { reason: 'token-refresh-failed' } })
        )
        throw new Error('Session expired. Please log in again.')
      }
    }
  }

  const errorData = await response.json().catch(() => ({}))
  const errorCode = (errorData.code || errorData.error?.code || '') as string
  const errorMessage =
    errorData.message ?? errorData.error?.message ?? errorData.detail ?? 'An error occurred. Please try again.'

  if (
    response.status === 403 &&
    (errorCode.startsWith('CSRF_') || errorMessage.toLowerCase().includes('csrf'))
  ) {
    try {
      const freshCsrf = await initCsrfToken(true)
      if (freshCsrf) {
        const headers = new Headers(options.headers ?? {})
        if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
        headers.set('X-Session-ID', getSessionId())
        headers.set('X-CSRF-Token', freshCsrf)
        const currentAccessToken = await getAccessToken()
        if (currentAccessToken) headers.set('Authorization', `Bearer ${currentAccessToken}`)

        const retryResponse = await executeWithTimeout(
          fullUrl,
          { ...options, headers },
          headers
        )

        if (retryResponse.ok) {
          if (responseType === 'blob') return retryResponse.blob()
          const data = await retryResponse.json()
          if (method === 'GET' && isCacheable(fullUrl, options))
            setCachedData(fullUrl, data, options)
          return data
        }
        const retryErrorData = await retryResponse.json().catch(() => ({}))
        const retryErrorMessage =
          retryErrorData.message ?? retryErrorData.error?.message ?? retryErrorData.detail ?? errorMessage
        throw new Error(retryErrorMessage)
      }
    } catch (e) {
      if (e instanceof Error && !e.message.toLowerCase().includes('csrf')) {
        throw e
      }
      if (import.meta.env.DEV) {
        console.warn('[API] CSRF auto-refresh retry failed:', e)
      }
    }
  }

  if (response.status === 401) {
    if (
      !normalizedEndpoint.includes('/auth/login') &&
      !normalizedEndpoint.includes('/auth/register')
    ) {
      throw new Error('Unauthorized')
    }
    throw new Error(errorMessage)
  } else if (response.status === 403) {
    throw new Error(errorMessage ?? 'Access denied')
  } else if (response.status === 404) {
    throw new Error('Resource not found')
  } else if (response.status >= 500) {
    throw new Error('Server error. Please try again later.')
  }

  throw new Error(errorMessage)
}

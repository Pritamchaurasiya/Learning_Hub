/**
 * Production-grade API client for LearningHub
 *
 * Features:
 * - Automatic retry with exponential backoff + jitter
 * - JWT token refresh with request queuing (single-flight)
 * - In-memory response caching + request deduplication
 * - Offline fallback from cache
 * - Client-side rate limiting
 * - CSRF protection for mutating operations
 * - Custom event dispatch on auth failures for App.tsx listener
 * - Input sanitization utilities
 */

// ─── Configuration ────────────────────────────────────────────────────
import {
  getCachedData,
  getInFlightRequest,
  getOfflineFallback,
  isCacheable,
  setCachedData,
  trackInFlightRequest,
} from './cache'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1'

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504] as readonly number[],
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 1000
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay)
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── CSRF ─────────────────────────────────────────────────────────────

const getCsrfToken = (): string | null => {
  const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'))
  return match ? match[2] : null
}

// ─── Client-side Rate Limiting ────────────────────────────────────────

const requestTimestamps: number[] = []

const isRateLimited = (): boolean => {
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift()
  }
  if (requestTimestamps.length >= 60) {
    return true
  }
  requestTimestamps.push(now)
  return false
}

// ─── Input Sanitization ──────────────────────────────────────────────

/**
 * Sanitize user-provided strings before sending to the API.
 * Prevents XSS and injection attacks.
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 10_000)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\beval\s*\(/gi, '')
}

/** Simple email format check */
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ─── Token Refresh (single-flight) ───────────────────────────────────

let tokenRefreshPromise: Promise<string> | null = null

const refreshAccessToken = async (): Promise<string> => {
  // If a refresh is already in flight, piggyback on it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise
  }

  tokenRefreshPromise = (async () => {
    if (isRateLimited()) {
      throw new Error('Too many requests. Please try again later.')
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const data = await response.json()
    const tokenData = data?.data ?? data
    const newAccessToken = tokenData?.access_token ?? tokenData?.access ?? tokenData?.token

    if (!newAccessToken) {
      throw new Error('Token refresh failed - no token received')
    }

    localStorage.setItem('token', newAccessToken)
    if (tokenData?.refresh_token || tokenData?.refresh) {
      localStorage.setItem('refreshToken', tokenData.refresh_token ?? tokenData.refresh)
    }

    return newAccessToken
  })().finally(() => {
    tokenRefreshPromise = null
  })

  return tokenRefreshPromise
}

// ─── Core fetchApi ───────────────────────────────────────────────────

export const fetchApi = async (
  endpoint: string,
  options: RequestInit = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  // Express normalization (remove trailing slash if present, unless it's just '/')
  const normalizedEndpoint =
    endpoint.endsWith('/') && endpoint.length > 1 ? endpoint.slice(0, -1) : endpoint
  const fullUrl = `${API_URL}${normalizedEndpoint}`

  // ── Cache layer (GET only) ────────────────────────────────────────
  const method = (options.method ?? 'GET').toUpperCase()

  if (method === 'GET') {
    const cachedData = getCachedData<unknown>(fullUrl, options)
    if (cachedData !== null) return cachedData

    const inFlight = getInFlightRequest<unknown>(fullUrl, options)
    if (inFlight !== null) return inFlight

    if (!navigator.onLine) {
      const offlineData = getOfflineFallback<unknown>(fullUrl, options)
      if (offlineData !== null) return offlineData
    }
  }

  // ── Rate limit ────────────────────────────────────────────────────
  if (isRateLimited()) {
    throw new Error('Too many requests. Please slow down.')
  }

  // ── Headers ───────────────────────────────────────────────────────
  const headers = new Headers(options.headers ?? {})
  headers.set('Content-Type', 'application/json')

  // CSRF for mutating ops
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
  }

  // Auth bearer token
  const token = localStorage.getItem('token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // ── Retry loop ────────────────────────────────────────────────────
  let lastError: Error | null = null
  let response: Response | null = null

  const executeRequest = async (): Promise<unknown> => {
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        response = await fetch(fullUrl, {
          ...options,
          headers,
          credentials: 'include',
        })

        if (response.ok) break

        if (!RETRY_CONFIG.retryableStatuses.includes(response.status)) break

        if (import.meta.env.DEV) {
          console.warn(
            `[API] Retryable ${response.status}, attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`
          )
        }
        if (attempt < RETRY_CONFIG.maxRetries) {
          await sleep(getDelay(attempt))
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Propagate AbortError immediately
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

    // ── Error handling ────────────────────────────────────────────
    if (response && !response.ok) {
      // 401 → try token refresh once
      if (response.status === 401) {
        try {
          const newToken = await refreshAccessToken()
          headers.set('Authorization', `Bearer ${newToken}`)

          const retryResponse = await fetch(fullUrl, {
            ...options,
            headers,
            credentials: 'include',
          })

          if (retryResponse.ok) {
            const data = await retryResponse.json()
            if (method === 'GET' && isCacheable(fullUrl, options)) {
              setCachedData(fullUrl, data, options)
            }
            return data
          }

          // Retry also failed — fall through to error handling below
          response = retryResponse
        } catch {
          // Refresh failed → dispatch session-expired event
          window.dispatchEvent(
            new CustomEvent('auth:session-expired', {
              detail: { reason: 'token-refresh-failed' },
            })
          )
          throw new Error('Session expired. Please log in again.')
        }
      }

      // Parse error body (only reached if not already returned/ thrown)
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData.message ?? errorData.detail ?? 'An error occurred. Please try again.'

      if (response.status === 401) {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { status: response.status },
          })
        )
        throw new Error('Unauthorized')
      } else if (response.status === 403) {
        throw new Error('Access denied')
      } else if (response.status === 404) {
        throw new Error('Resource not found')
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.')
      }

      throw new Error(errorMessage)
    }

    // ── Success ─────────────────────────────────────────────────
    if (response?.ok) {
      const data = await response.json()
      // Populate cache for GET requests
      if (method === 'GET' && isCacheable(fullUrl, options)) {
        setCachedData(fullUrl, data, options)
      }
      return data
    }

    if (lastError) throw lastError
    if (!response) {
      throw new Error('Network error. Please check your connection.')
    }

    return response.json()
  }

  // ── Request deduplication for GETs ────────────────────────────────
  if (method === 'GET') {
    return trackInFlightRequest(fullUrl, options, executeRequest())
  }

  return executeRequest()
}

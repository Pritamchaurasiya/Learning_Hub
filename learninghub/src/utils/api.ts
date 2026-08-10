import {
  getCachedData,
  getInFlightRequest,
  getOfflineFallback,
  invalidateCache,
  isCacheable,
  setCachedData,
  trackInFlightRequest,
} from './cache'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  const msg = import.meta.env.PROD
    ? 'VITE_API_URL environment variable is required in production'
    : 'VITE_API_URL environment variable is not set.'
  throw new Error(msg)
}

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504] as readonly number[],
}

const REQUEST_TIMEOUT_MS = 30_000

function getDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  return Math.min(delay + Math.random() * 1000, RETRY_CONFIG.maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let csrfTokenMemory: string | null = null

export const getCsrfToken = (): string | null => {
  if (csrfTokenMemory) return csrfTokenMemory
  const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'))
  const token = match ? match[2] : null
  if (token) csrfTokenMemory = token
  return token
}

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('sessionId')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('sessionId', sessionId)
  }
  return sessionId
}

export const setCsrfToken = (token: string): void => {
  csrfTokenMemory = token
  const secureSuffix = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `csrf-token=${token}; path=/; SameSite=Lax${secureSuffix}`
}

export const initCsrfToken = async (forceRefresh = false): Promise<void> => {
  if (!forceRefresh && getCsrfToken()) return
  try {
    const response = await fetch(`${API_URL}/csrf-token`, {
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': getSessionId() },
    })
    if (response.ok) {
      const body = await response.json()
      const csrfToken = body?.data?.csrfToken ?? body?.csrfToken
      if (csrfToken) setCsrfToken(csrfToken)
    }
  } catch {
    // silently ignore
  }
}

const rateLimitState = { count: 0, windowStart: Date.now() }

const isRateLimited = (): boolean => {
  const now = Date.now()
  if (now - rateLimitState.windowStart > 60_000) {
    rateLimitState.count = 0
    rateLimitState.windowStart = now
  }
  rateLimitState.count++
  if (rateLimitState.count > 60) {
    console.warn('[API] Client rate limit exceeded (60 req/min)')
    return true
  }
  return false
}

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, 10_000)
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/\beval\s*\(/gi, '')
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
]
INVALIDATE_CACHE_EVENTS.forEach(event => {
  window.addEventListener(event, () => invalidateCache())
})

let tokenRefreshPromise: Promise<void> | null = null

const refreshAccessToken = async (): Promise<void> => {
  if (tokenRefreshPromise) return tokenRefreshPromise

  tokenRefreshPromise = (async () => {
    if (isRateLimited()) throw new Error('Too many requests. Please try again later.')

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    }
    const csrfToken = getCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
    })

    if (!response.ok) throw new Error('Token refresh failed')

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

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (!csrfToken) await initCsrfToken(false)
    const finalToken = getCsrfToken()
    if (finalToken) headers.set('X-CSRF-Token', finalToken)
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

        if (!RETRY_CONFIG.retryableStatuses.includes(response.status)) {
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

        const retryResponse = await fetch(fullUrl, { ...options, headers, credentials: 'include' })

        if (retryResponse.ok) {
          if (responseType === 'blob') return retryResponse.blob()
          const data = await retryResponse.json()
          if (method === 'GET' && isCacheable(fullUrl, options))
            setCachedData(fullUrl, data, options)
          return data
        }
        response = retryResponse
      } catch {
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', { detail: { reason: 'token-refresh-failed' } })
        )
        throw new Error('Session expired. Please log in again.')
      }
    }
  }

  const errorData = await response.json().catch(() => ({}))
  const errorMessage =
    errorData.message ?? errorData.detail ?? 'An error occurred. Please try again.'

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

import {
  getCachedData,
  getInFlightRequest,
  getOfflineFallback,
  isCacheable,
  setCachedData,
  trackInFlightRequest,
} from './cache'
import { SecureStorage } from './security'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1'

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504] as readonly number[],
}

const REQUEST_TIMEOUT_MS = 30_000

function getDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 1000
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay)
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const getCsrfToken = (): string | null => {
  const match = document.cookie.match(new RegExp('(^| )csrf-token=([^;]+)'))
  return match ? match[2] : null
}

export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('sessionId')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('sessionId', sessionId)
  }
  return sessionId
}

const getAccessToken = async (): Promise<string | null> => {
  return SecureStorage.getItem('token')
}

const setAccessToken = async (token: string | null): Promise<void> => {
  if (token) await SecureStorage.setItem('token', token)
  else SecureStorage.removeItem('token')
}

const getRefreshToken = async (): Promise<string | null> => {
  return SecureStorage.getItem('refreshToken')
}

const setRefreshToken = async (token: string | null): Promise<void> => {
  if (token) await SecureStorage.setItem('refreshToken', token)
  else SecureStorage.removeItem('refreshToken')
}

export const initCsrfToken = async (forceRefresh = false): Promise<void> => {
  if (!forceRefresh && getCsrfToken()) return
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    }
    const response = await fetch(`${API_URL}/csrf-token`, { headers })
    if (response.ok) {
      const data = await response.json()
      if (data.csrfToken) {
        const secureSuffix = window.location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `csrf-token=${data.csrfToken}; path=/; SameSite=Lax${secureSuffix}`
      }
    }
  } catch {
    // silently ignore
  }
}

const requestTimestamps: number[] = []

const isRateLimited = (): boolean => {
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift()
  }
  if (requestTimestamps.length >= 60) return true
  requestTimestamps.push(now)
  return false
}

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

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

let tokenRefreshPromise: Promise<string> | null = null

const refreshAccessToken = async (): Promise<string> => {
  if (tokenRefreshPromise) return tokenRefreshPromise

  tokenRefreshPromise = (async () => {
    if (isRateLimited()) {
      throw new Error('Too many requests. Please try again later.')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    }
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    // Refresh token is now sent automatically via httpOnly cookies
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const data = await response.json()
    const tokenData = data?.data ?? data
    const newAccessToken = tokenData?.access_token ?? tokenData?.access ?? tokenData?.token
    const newRefreshToken = tokenData?.refresh_token ?? tokenData?.refresh ?? null

    if (!newAccessToken) {
      throw new Error('Token refresh failed - no token received')
    }

    await setAccessToken(newAccessToken)
    if (newRefreshToken) {
      await setRefreshToken(newRefreshToken)
    }

    window.dispatchEvent(new CustomEvent('auth:token-refreshed'))
    return newAccessToken
  })().finally(() => {
    tokenRefreshPromise = null
  })

  return tokenRefreshPromise
}

export interface FetchApiOptions extends RequestInit {
  responseType?: 'json' | 'blob'
}

export const fetchApi = async (
  endpoint: string,
  options: FetchApiOptions = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const responseType = (options as FetchApiOptions).responseType ?? 'json'
  const normalizedEndpoint =
    endpoint.endsWith('/') && endpoint.length > 1 ? endpoint.slice(0, -1) : endpoint
  const fullUrl = `${API_URL}${normalizedEndpoint}`

  const method = (options.method ?? 'GET').toUpperCase()

  if (responseType === 'json' && method === 'GET') {
    const cachedData = getCachedData<unknown>(fullUrl, options)
    if (cachedData !== null) return cachedData

    if (!options.signal) {
      const inFlight = getInFlightRequest<unknown>(fullUrl, options)
      if (inFlight !== null) return inFlight
    }

    if (!navigator.onLine) {
      const offlineData = getOfflineFallback<unknown>(fullUrl, options)
      if (offlineData !== null) return offlineData
    }
  }

  if (isRateLimited()) {
    throw new Error('Too many requests. Please slow down.')
  }

  const headers = new Headers(options.headers ?? {})
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('X-Session-ID', getSessionId())

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      await initCsrfToken(false)
    }
    const finalToken = getCsrfToken()
    if (finalToken) headers.set('X-CSRF-Token', finalToken)
  }

  const token = await getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // ── Retry loop ────────────────────────────────────────────────────
  let lastError: Error | null = null
  let response: Response | null = null

  const executeRequest = async (): Promise<unknown> => {
    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        // Add request timeout if not already aborted
        const hasSignal = options.signal !== undefined
        const controller = hasSignal ? undefined : new AbortController()
        const timeoutId = controller
          ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
          : undefined

        try {
          response = await fetch(fullUrl, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller?.signal ?? options.signal,
          })
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId)
        }

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

    if (response && !response.ok) {
      if (response.status === 401) {
        const isAuthEndpoint =
          normalizedEndpoint.includes('/auth/login') ||
          normalizedEndpoint.includes('/auth/register') ||
          normalizedEndpoint.includes('/auth/refresh')

        if (!isAuthEndpoint) {
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

            response = retryResponse
          } catch {
            window.dispatchEvent(
              new CustomEvent('auth:session-expired', {
                detail: { reason: 'token-refresh-failed' },
              })
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

    if (response?.ok) {
      if (responseType === 'blob') return response.blob()
      const data = await response.json()
      if (method === 'GET' && isCacheable(fullUrl, options)) {
        setCachedData(fullUrl, data, options)
      }
      return data
    }

    if (lastError) throw lastError
    if (!response) {
      throw new Error('Network error. Please check your connection.')
    }

    if (responseType === 'blob') return response.blob()
    return response.json()
  }

  if (responseType === 'json' && method === 'GET' && !options.signal) {
    return trackInFlightRequest(fullUrl, options, executeRequest())
  }

  return executeRequest()
}

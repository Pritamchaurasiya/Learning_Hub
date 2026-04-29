const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}

function getDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 1000
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay)
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let tokenRefreshPromise: Promise<string> | null = null;

  const refreshAccessToken = async (): Promise<string> => {
    if (tokenRefreshPromise) {
      return tokenRefreshPromise
    }

    tokenRefreshPromise = (async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken')
      if (!storedRefreshToken) {
        throw new Error('No refresh token available')
      }

      // Backend expects "refresh_token" field, not "refresh"
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefreshToken })
      })

      if (!response.ok) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      // Backend returns top-level { access_token, refresh_token } (NOT nested under data)
      const newAccessToken = data.access_token || data.access || data.token
      const newRefreshToken = data.refresh_token || data.refresh

      localStorage.setItem('token', newAccessToken)
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken)
      }

      tokenRefreshPromise = null
      return newAccessToken
    })()

    return tokenRefreshPromise
  }

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  // Use endpoint as-is (Cloudflare Workers style, no forced trailing slash)
  const normalizedEndpoint = endpoint;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  let lastError: Error | null = null
  let response: Response | null = null

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      response = await fetch(`${API_URL}${normalizedEndpoint}`, {
        ...options,
        headers,
      })

      if (response.ok) break

      if (!RETRY_CONFIG.retryableStatuses.includes(response.status)) {
        break
      }

      if (import.meta.env.DEV) {
        console.warn(`[API] Retryable error ${response.status}, attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`);
      }
      if (attempt < RETRY_CONFIG.maxRetries) {
        await sleep(getDelay(attempt))
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (import.meta.env.DEV) {
        console.warn(`[API] Network error, attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`, lastError);
      }
      if (attempt < RETRY_CONFIG.maxRetries) {
        await sleep(getDelay(attempt))
      }
    }
  }

  if (!response?.ok && response) {
    // Handle 401 - try token refresh once
    if (response.status === 401 && token) {
      try {
        const newToken = await refreshAccessToken()
        headers.set('Authorization', `Bearer ${newToken}`)
        response = await fetch(`${API_URL}${normalizedEndpoint}`, {
          ...options,
          headers,
        })
        // If refresh succeeded and new request is OK, return data
        if (response.ok) {
          return response.json()
        }
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        throw new Error('Session expired. Please log in again.')
      }
    }

    const errorData = await response.json().catch(() => ({}))
    // Backend wraps errors: { status: "error", message: "..." } or DRF: { detail: "..." }
    const errorMessage = errorData.message || errorData.detail || errorData.error || `Error ${response.status}: ${response.statusText}`
    
    if (response.status === 401) {
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

  if (lastError) throw lastError
  if (!response) throw new Error('Network error. Please check your connection.')

  return response.json()
};

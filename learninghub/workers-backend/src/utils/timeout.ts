/**
 * Request timeout utilities for external API calls
 * Prevents hanging requests when external services are slow or unavailable
 */

export class TimeoutError extends Error {
  constructor(message = 'Request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @param errorMessage - Custom error message
 * @returns Promise that rejects if timeout exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 30000,
  errorMessage?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(errorMessage || `Request timed out after ${ms}ms`))
    }, ms)
  })

  return Promise.race([promise, timeout])
}

/**
 * Fetch with timeout wrapper
 * Automatically adds AbortController signal with timeout
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns Fetch response
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Timeout configurations for different service types
 */
export const TIMEOUTS = {
  HUGGING_FACE: 30000, // 30s for AI model inference
  DATABASE: 10000, // 10s for database queries
  EXTERNAL_API: 15000, // 15s for general external APIs
  HEALTH_CHECK: 5000, // 5s for health checks
} as const

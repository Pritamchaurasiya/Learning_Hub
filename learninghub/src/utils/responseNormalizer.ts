/**
 * API Response Normalizer
 * 
 * Standardizes all API responses to a consistent format:
 * { status: 'success' | 'error', data: T, message?: string, code?: string, meta?: Record<string, unknown> }
 * 
 * Handles various backend response formats:
 * - { status: 'success', data: T }
 * - { status: 'success', data: { results: T[] } }
 * - { status: 'success', data: T, results: T[] }  (legacy)
 * - Flat object responses (no status wrapper)
 * - Error responses with various structures
 */

import type { ApiResponse } from './api'

/**
 * Check if response is already in standard format
 */
function isStandardResponse(response: unknown): response is ApiResponse {
  if (!response || typeof response !== 'object') return false
  const obj = response as Record<string, unknown>
  return 'status' in obj && ('data' in obj || 'message' in obj)
}

/**
 * Normalize a response to standard format
 */
export function normalizeResponse<T = unknown>(response: unknown, _endpoint?: string): ApiResponse<T> {
  // Already standard format
  if (isStandardResponse(response)) {
    return response as ApiResponse<T>
  }

  // Handle null/undefined
  if (response === null || response === undefined) {
    return {
      status: 'error',
      message: 'No response received',
      data: null as unknown as T,
    }
  }

  const obj = response as Record<string, unknown>

  // Handle { data: { results: [...] } } - paginated responses
  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>
    if (Array.isArray(data.results)) {
      return {
        status: (obj.status === 'error' ? 'error' : 'success'),
        data: data.results as unknown as T,
        message: obj.message as string,
        code: obj.code as string,
        meta: {
          page: data.page,
          pages: data.pages,
          total: data.total,
        },
      }
    }
    // Handle { data: { data: [...] } } - nested data
    if (Array.isArray(data.data)) {
      return {
        status: (obj.status === 'error' ? 'error' : 'success'),
        data: data.data as unknown as T,
        message: obj.message as string,
        code: obj.code as string,
      }
    }
  }

  // Handle flat array response: [...]
  if (Array.isArray(obj)) {
    return {
      status: 'success',
      data: obj as unknown as T,
    }
  }

  // Handle flat object response (e.g., { id: '1', title: 'Test' })
  if (obj.id || obj.slug || obj.title) {
    return {
      status: 'success',
      data: obj as unknown as T,
    }
  }

  // Handle { results: [...] } without status
  if (Array.isArray(obj.results)) {
    return {
      status: 'success',
      data: obj.results as unknown as T,
      meta: {
        page: obj.page,
        pages: obj.pages,
        total: obj.total,
      },
    }
  }

  // Fallback: return as-is wrapped in standard format
  return {
    status: 'success',
    data: obj as unknown as T,
  }
}

/**
 * Normalize error response to standard format
 */
export function normalizeErrorResponse(error: unknown, defaultMessage = 'An error occurred'): ApiResponse {
  if (error instanceof Response) {
    // Fetch Response object
    return {
      status: 'error',
      message: defaultMessage,
      data: null as unknown as unknown,
      code: `HTTP_${error.status}`,
    }
  }

  if (error instanceof Error) {
    return {
      status: 'error',
      message: error.message,
      data: null as unknown as unknown,
      code: error.name,
    }
  }

  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    const errObj = (obj.error && typeof obj.error === 'object') ? (obj.error as Record<string, unknown>) : null
    return {
      status: 'error',
      message: (obj.message as string) || (obj.detail as string) || (obj.error as string) || defaultMessage,
      data: null as unknown as unknown,
      code: (obj.code as string) || (errObj?.code as string),
    }
  }

  return {
    status: 'error',
    message: String(error) || defaultMessage,
    data: null as unknown as unknown,
  }
}

/**
 * Extract data from normalized response (for backward compatibility)
 */
export function extractData<T>(response: ApiResponse<T>): T {
  return response.data
}

/**
 * Check if response is successful
 */
export function isSuccess(response: ApiResponse): boolean {
  return response.status === 'success'
}

/**
 * Get error message from response
 */
export function getErrorMessage(response: ApiResponse): string {
  return response.message || 'Unknown error'
}
/**
 * Type-safe API response extraction utilities.
 *
 * Standard API response format:
 *   { status: 'success', data: T, message?: string, meta?: unknown }
 *
 * Extractors normalize both wrapped and unwrapped responses.
 */

export interface ApiResponse<T = unknown> {
  status?: string
  data?: T
  message?: string
  meta?: unknown
}

export interface ApiErrorResponse {
  status: 'error'
  message: string
  code?: string
  errors?: Array<{ field: string; message: string }>
  details?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractData<T>(response: unknown, fallback: T | null = null): T | null {
  if (!isObject(response)) return fallback

  if ('data' in response && response.data !== undefined && response.data !== null) {
    return response.data as T
  }

  if ('user' in response) return response as unknown as T

  return response as unknown as T
}

export function extractMessage(response: unknown): string | undefined {
  if (!isObject(response)) return undefined
  if (typeof response.message === 'string') return response.message
  return undefined
}

export function extractMeta(response: unknown): unknown | undefined {
  if (!isObject(response)) return undefined
  return response.meta
}

export function isApiError(response: unknown): response is ApiErrorResponse {
  if (!isObject(response)) return false
  return response.status === 'error'
}

export function extractPaginationMeta(meta: unknown): {
  total: number
  page: number
  limit: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
} | null {
  if (!isObject(meta)) return null
  return {
    total: (meta.total as number) ?? 0,
    page: (meta.page as number) ?? 1,
    limit: (meta.limit as number) ?? 20,
    pages: (meta.pages as number) ?? 1,
    hasNext: (meta.hasNext as boolean) ?? false,
    hasPrev: (meta.hasPrev as boolean) ?? false,
  }
}

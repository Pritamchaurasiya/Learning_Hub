/**
 * Pagination utility for API endpoints
 */

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  status: string
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

import { ParsedQs } from 'qs'

export const getPaginationParams = (
  query: ParsedQs
): { page: number; limit: number; skip: number } => {
  const parsedPage = parseInt(query.page as string)
  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage)

  const parsedLimit = parseInt(query.limit as string)
  const limit = Math.min(100, Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit))

  const skip = (page - 1) * limit

  return { page, limit, skip }
}

export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => {
  const pages = Math.ceil(total / limit)

  return {
    status: 'success',
    data,
    meta: {
      total,
      page,
      limit,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  }
}

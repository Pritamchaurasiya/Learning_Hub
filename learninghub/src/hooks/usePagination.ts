import { useState, useCallback, useRef, useEffect } from 'react'
import { extractPaginationMeta } from '../utils/apiHelpers'

interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
}

interface UsePaginationReturn {
  page: number
  limit: number
  totalPages: number
  total: number
  hasNext: boolean
  hasPrev: boolean
  isLoading: boolean
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setLimit: (limit: number) => void
  onResponse: (meta: unknown) => void
  reset: () => void
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialLimit = 20 } = options
  const [page, setPageState] = useState(initialPage)
  const [limit, setLimitState] = useState(initialLimit)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const loadingRef = useRef(false)

  useEffect(() => {
    loadingRef.current = isLoading
  }, [isLoading])

  const onResponse = useCallback((meta: unknown) => {
    const pagination = extractPaginationMeta(meta)
    if (pagination) {
      setTotalPages(pagination.pages)
      setTotal(pagination.total)
      setHasNext(pagination.hasNext)
      setHasPrev(pagination.hasPrev)
    }
    setIsLoading(false)
  }, [])

  const setPage = useCallback((newPage: number) => {
    if (loadingRef.current) return
    setIsLoading(true)
    setPageState(newPage)
  }, [])

  const nextPage = useCallback(() => {
    setPage(page + 1)
  }, [page, setPage])

  const prevPage = useCallback(() => {
    setPage(page - 1)
  }, [page, setPage])

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit)
    setPageState(1)
  }, [])

  const reset = useCallback(() => {
    setPageState(initialPage)
    setLimitState(initialLimit)
    setTotalPages(1)
    setTotal(0)
    setHasNext(false)
    setHasPrev(false)
    setIsLoading(false)
  }, [initialPage, initialLimit])

  return {
    page,
    limit,
    totalPages,
    total,
    hasNext,
    hasPrev,
    isLoading,
    setPage,
    nextPage,
    prevPage,
    setLimit,
    onResponse,
    reset,
  }
}

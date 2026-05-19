import { useCallback, useRef } from 'react'

interface PrefetchOptions {
  expiresIn?: number // milliseconds
}

/**
 * usePrefetch - Hook for prefetching and caching data
 * Useful for prefetching data on hover/focus before navigation
 */
export function usePrefetch<T>(fetcher: () => Promise<T>, options: PrefetchOptions = {}) {
  const { expiresIn = 60000 } = options // Default 1 minute cache
  const cacheRef = useRef<{
    data: T | null
    timestamp: number
    promise: Promise<T> | null
  }>({
    data: null,
    timestamp: 0,
    promise: null,
  })

  const prefetch = useCallback(async (): Promise<T> => {
    const now = Date.now()
    const cache = cacheRef.current

    // Return cached data if not expired
    if (cache.data && now - cache.timestamp < expiresIn) {
      return cache.data
    }

    // Return existing promise if already fetching
    if (cache.promise) {
      return cache.promise
    }

    // Fetch new data
    const promise = fetcher().then(data => {
      cache.data = data
      cache.timestamp = now
      cache.promise = null
      return data
    })

    cache.promise = promise
    return promise
  }, [fetcher, expiresIn])

  const clearCache = useCallback(() => {
    cacheRef.current = {
      data: null,
      timestamp: 0,
      promise: null,
    }
  }, [])

  const getCachedData = useCallback((): T | null => {
    const cache = cacheRef.current
    const now = Date.now()

    if (cache.data && now - cache.timestamp < expiresIn) {
      return cache.data
    }

    return null
  }, [expiresIn])

  return {
    prefetch,
    clearCache,
    getCachedData,
  }
}

export default usePrefetch

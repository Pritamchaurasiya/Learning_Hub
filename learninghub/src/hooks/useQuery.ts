import { useState, useEffect, useCallback, useRef } from 'react'

// Global cache to persist data across component mounts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queryCache = new Map<string, any>()
// Tracks active fetch promises to prevent duplicate simultaneous network requests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activeRequests = new Map<string, Promise<any>>()

interface UseQueryOptions<T> {
  // If true, will not trigger the fetch
  skip?: boolean
  // If true, bypasses the cache and forces a fresh network request
  revalidate?: boolean
  // Fallback data
  initialData?: T
  // Callback when data is successfully fetched
  onSuccess?: (data: T) => void
  // Callback on error
  onError?: (error: Error) => void
}

interface UseQueryResult<T> {
  data: T | null
  isLoading: boolean
  isValidating: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const { skip = false, revalidate = false, initialData, onSuccess, onError } = options

  // Initialize with cache if available, otherwise initialData
  const cachedData = key ? queryCache.get(key) : undefined

  const [data, setData] = useState<T | null>(
    cachedData !== undefined ? cachedData : (initialData ?? null)
  )
  const [error, setError] = useState<string | null>(null)

  // isLoading is true ONLY if we have no data at all (first load)
  const [isLoading, setIsLoading] = useState<boolean>(!data && !skip)

  // isValidating is true anytime a network request is inflight (even if we have stale data)
  const [isValidating, setIsValidating] = useState<boolean>(!skip)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const fetchData = useCallback(
    async (force = false) => {
      if (!key || skip) return

      // If we have cached data and aren't forcing a revalidation, we just use it
      if (!force && !revalidate && queryCache.has(key)) {
        setIsValidating(false)
        setIsLoading(false)
        return
      }

      setIsValidating(true)
      if (!data) setIsLoading(true)
      setError(null)

      try {
        // Deduplication logic: If a request for this key is already in flight, await it instead of firing a new one
        let requestPromise = activeRequests.get(key)

        if (!requestPromise) {
          requestPromise = fetcher()
          activeRequests.set(key, requestPromise)
        }

        const result = await requestPromise

        if (isMounted.current) {
          queryCache.set(key, result)
          setData(result)
          onSuccess?.(result)
        }
      } catch (err) {
        if (isMounted.current) {
          const errorMsg = err instanceof Error ? err.message : 'An error occurred'
          setError(errorMsg)
          onError?.(err instanceof Error ? err : new Error(errorMsg))
        }
      } finally {
        // Clean up the active request once it's done (success or fail)
        if (activeRequests.has(key)) {
          activeRequests.delete(key)
        }
        if (isMounted.current) {
          setIsValidating(false)
          setIsLoading(false)
        }
      }
    },
    [key, fetcher, skip, revalidate, data, onSuccess, onError]
  )

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]) // Re-run if the key changes

  const mutate = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  return { data, isLoading, isValidating, error, mutate }
}

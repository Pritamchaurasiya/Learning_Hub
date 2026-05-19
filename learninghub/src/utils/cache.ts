/**
 * Intelligent API Caching Layer
 * - In-memory cache with configurable TTL
 * - Request deduplication (prevents duplicate in-flight requests)
 * - Offline fallback support
 * - Cache invalidation strategies
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  url: string
}

interface CacheConfig {
  defaultTTL: number // milliseconds
  maxEntries: number
  enabled: boolean
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 100,
  enabled: true,
}

// In-memory cache storage
const cache = new Map<string, CacheEntry<unknown>>()

// Track in-flight requests for deduplication
const inFlightRequests = new Map<string, Promise<unknown>>()

let config: CacheConfig = { ...DEFAULT_CONFIG }

/**
 * Generate a cache key from URL and options
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  if (!options || Object.keys(options).length === 0) {
    return url
  }
  // Include method and body in cache key for POST requests
  const method = options.method ?? 'GET'
  const body = options.body ? String(options.body) : ''
  return `${method}:${url}:${body}`
}

/**
 * Check if cache entry is valid (not expired)
 */
function isValid(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp < entry.ttl
}

/**
 * Clean up expired cache entries
 */
function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl * 2) {
      cache.delete(key)
    }
  }
}

/**
 * Enforce maximum cache size (LRU eviction)
 */
function enforceMaxSize(): void {
  if (cache.size <= config.maxEntries) return

  // Convert to array and sort by timestamp (oldest first)
  const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)

  // Remove oldest entries
  const toRemove = entries.slice(0, entries.length - config.maxEntries)
  for (const [key] of toRemove) {
    cache.delete(key)
  }
}

/**
 * Configure cache settings
 */
export function configureCache(options: Partial<CacheConfig>): void {
  config = { ...config, ...options }
}

/**
 * Check if a request should be cached based on method and URL
 */
export function isCacheable(url: string, options?: RequestInit): boolean {
  if (!config.enabled) return false

  const method = options?.method?.toUpperCase() ?? 'GET'
  if (method !== 'GET') return false

  // Don't cache authenticated-sensitive endpoints
  const noCachePatterns = ['/auth/', '/login', '/logout', '/password', '/token']

  return !noCachePatterns.some(pattern => url.includes(pattern))
}

/**
 * Get cached data for a request
 */
export function getCachedData<T>(url: string, options?: RequestInit): T | null {
  if (!isCacheable(url, options)) return null

  const key = generateCacheKey(url, options)
  const entry = cache.get(key) as CacheEntry<T> | undefined

  if (entry && isValid(entry)) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[Cache] Hit: ${url}`)
    }
    return entry.data
  }

  if (entry) {
    // Expired entry, remove it
    cache.delete(key)
  }

  return null
}

/**
 * Store data in cache
 */
export function setCachedData<T>(url: string, data: T, options?: RequestInit, ttl?: number): void {
  if (!isCacheable(url, options)) return

  const key = generateCacheKey(url, options)
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttl ?? config.defaultTTL,
    url,
  }

  cache.set(key, entry as CacheEntry<unknown>)
  enforceMaxSize()

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[Cache] Stored: ${url} (TTL: ${entry.ttl}ms)`)
  }
}

/**
 * Request deduplication - returns existing promise if request is in-flight
 */
export function getInFlightRequest<T>(url: string, options?: RequestInit): Promise<T> | null {
  const key = generateCacheKey(url, options)
  const existing = inFlightRequests.get(key)
  return existing ? (existing as Promise<T>) : null
}

/**
 * Track an in-flight request for deduplication
 */
export function trackInFlightRequest<T>(
  url: string,
  options: RequestInit | undefined,
  promise: Promise<T>
): Promise<T> {
  const key = generateCacheKey(url, options)
  inFlightRequests.set(key, promise as Promise<unknown>)

  // Clean up when request completes
  promise
    .then(() => {
      inFlightRequests.delete(key)
    })
    .catch(() => {
      inFlightRequests.delete(key)
    })

  return promise
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[Cache] All entries cleared')
    }
    return
  }

  for (const [key, entry] of cache.entries()) {
    if (entry.url.includes(pattern)) {
      cache.delete(key)
    }
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[Cache] Invalidated pattern: ${pattern}`)
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  maxSize: number
  hitRate: number
} {
  return {
    size: cache.size,
    maxSize: config.maxEntries,
    hitRate: 0, // Could implement hit/miss tracking if needed
  }
}

/**
 * Check if device is offline and serve cached data
 */
export function getOfflineFallback<T>(url: string, options?: RequestInit): T | null {
  if (navigator.onLine) return null

  const key = generateCacheKey(url, options)
  const entry = cache.get(key) as CacheEntry<T> | undefined

  if (entry) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[Cache] Offline fallback served: ${url}`)
    }
    return entry.data
  }

  return null
}

// Periodic cleanup of expired entries (browser-only, skipped in SSR/test)
let cleanupInterval: ReturnType<typeof setInterval> | null = null
if (typeof window !== 'undefined') {
  cleanupInterval = setInterval(cleanup, 60 * 1000)
}

/** Stop the periodic cache cleanup (useful in tests/SSR) */
export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

/**
 * Frontend Cache Service
 * Provides in-memory caching with localStorage fallback
 * Reduces API calls and improves performance
 */

const MEMORY_CACHE = new Map<string, { data: unknown; expiry: number }>()

const DEFAULT_TTL = {
  SEARCH: 5 * 60 * 1000, // 5 minutes
  COURSE: 10 * 60 * 1000, // 10 minutes
  USER: 5 * 60 * 1000, // 5 minutes
  STATIC: 60 * 60 * 1000, // 1 hour
}

export class CacheService {
  /**
   * Set a value in cache
   */
  static set<T>(key: string, value: T, ttl: number = DEFAULT_TTL.STATIC): void {
    const expiry = Date.now() + ttl
    MEMORY_CACHE.set(key, { data: value, expiry })

    // Also persist to localStorage for non-sensitive data (optional)
    if (!key.includes('token') && !key.includes('auth')) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({ data: value, expiry }))
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  /**
   * Get a value from cache
   */
  static get<T>(key: string): T | null {
    // Check memory cache first
    const cached = MEMORY_CACHE.get(key)
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T
    }

    // Memory cache expired or not found
    MEMORY_CACHE.delete(key)

    // Try localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.expiry > Date.now()) {
          // Restore to memory cache
          MEMORY_CACHE.set(key, parsed)
          return parsed.data as T
        } else {
          localStorage.removeItem(`cache_${key}`)
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    return null
  }

  /**
   * Delete a value from cache
   */
  static delete(key: string): void {
    MEMORY_CACHE.delete(key)
    try {
      localStorage.removeItem(`cache_${key}`)
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    MEMORY_CACHE.clear()
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const memorySize = MEMORY_CACHE.size
    let localStorageSize = 0
    try {
      localStorageSize = Object.keys(localStorage).filter(key => key.startsWith('cache_')).length
    } catch {
      // Ignore
    }
    return { memorySize, localStorageSize }
  }
}

/**
 * Cache key generator
 */
export const CacheKeys = {
  search: (query: string, filters: Record<string, string | number | boolean>) =>
    `search_${query}_${JSON.stringify(filters)}`,

  course: (id: string) => `course_${id}`,

  courseList: (params: Record<string, string | number | boolean>) =>
    `courses_${JSON.stringify(params)}`,

  user: (id: string) => `user_${id}`,

  static: (key: string) => `static_${key}`,
}

/**
 * Cache wrapper for API calls
 */
export async function withCache<T>(
  fn: () => Promise<T>,
  cacheKey: string,
  ttl: number = DEFAULT_TTL.STATIC
): Promise<T> {
  // Check cache first
  const cached = CacheService.get<T>(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch fresh data
  const data = await fn()

  // Store in cache
  CacheService.set(cacheKey, data, ttl)

  return data
}

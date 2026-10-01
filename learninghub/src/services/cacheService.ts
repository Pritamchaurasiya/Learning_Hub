import { getCachedData, setCachedData, invalidateCache, getCacheStats } from '../utils/cache'

const DEFAULT_TTL = {
  SEARCH: 2 * 60 * 1000,
  COURSE: 5 * 60 * 1000,
  USER: 2 * 60 * 1000,
  STATIC: 30 * 60 * 1000,
}

export class CacheService {
  static set<T>(key: string, value: T, ttl: number = DEFAULT_TTL.STATIC): void {
    setCachedData(key, value, undefined, ttl)
  }

  static get<T>(key: string): T | null {
    return getCachedData<T>(key)
  }

  static delete(key: string): void {
    invalidateCache(key)
  }

  static clear(): void {
    invalidateCache()
  }

  static getStats() {
    const stats = getCacheStats()
    return { memorySize: stats.size, localStorageSize: 0 }
  }
}

export const CacheKeys = {
  search: (query: string, filters: Record<string, string | number | boolean>) => {
    // Deterministic key: sort filter keys
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(k => `${k}:${filters[k]}`)
      .join(',')
    return `search_${query}_${sortedFilters}`
  },

  course: (id: string) => `course_${id}`,

  courseList: (params: Record<string, string | number | boolean>) => {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join(',')
    return `courses_${sortedParams}`
  },

  user: (id: string) => `user_${id}`,

  static: (key: string) => `static_${key}`,
}

export async function withCache<T>(
  fn: () => Promise<T>,
  cacheKey: string,
  ttl: number = DEFAULT_TTL.STATIC
): Promise<T> {
  const cached = CacheService.get<T>(cacheKey)
  if (cached) {
    return cached
  }

  const data = await fn()
  CacheService.set(cacheKey, data, ttl)
  return data
}

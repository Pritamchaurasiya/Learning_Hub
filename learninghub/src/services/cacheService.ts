import {
  getCachedData,
  setCachedData,
  invalidateCache,
  getCacheStats,
} from '../utils/cache'

const DEFAULT_TTL = {
  SEARCH: 5 * 60 * 1000,
  COURSE: 10 * 60 * 1000,
  USER: 5 * 60 * 1000,
  STATIC: 60 * 60 * 1000,
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
  search: (query: string, filters: Record<string, string | number | boolean>) =>
    `search_${query}_${JSON.stringify(filters)}`,

  course: (id: string) => `course_${id}`,

  courseList: (params: Record<string, string | number | boolean>) =>
    `courses_${JSON.stringify(params)}`,

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

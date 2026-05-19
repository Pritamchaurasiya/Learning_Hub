/**
 * Redis Cache Middleware
 *
 * Uses Redis for distributed caching across multiple backend instances.
 * Falls back to in-memory NodeCache when Redis is unavailable.
 *
 * Features:
 *  - User-scoped cache keys for authenticated endpoints
 *  - Configurable TTL per endpoint
 *  - Cache invalidation by pattern
 *  - Graceful degradation to NodeCache
 */

import NodeCache from 'node-cache'
import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../services/CacheService'
import logger from '../utils/logger'

// Fallback in-memory cache
const fallbackCache = new NodeCache({ stdTTL: 300, checkperiod: 120 })

export const redisCacheMiddleware = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') {
      next()
      return
    }

    const key = `cache:${req.originalUrl || req.url}_${req.user?.userId ?? 'anonymous'}`

    try {
      // Try Redis first
      const cached = await cacheService.get<string>(key)
      if (cached) {
        if (process.env.NODE_ENV !== 'test') {
          logger.info(`[RedisCache] HIT for ${key}`)
        }
        res.json(JSON.parse(cached))
        return
      }

      if (process.env.NODE_ENV !== 'test') {
        logger.info(`[RedisCache] MISS for ${key}`)
      }

      // Override res.json to capture and cache
      const originalJson = res.json.bind(res)
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            cacheService.set(key, JSON.stringify(body), durationInSeconds).catch(() => {
              // Fallback to NodeCache if Redis fails
              fallbackCache.set(key, body, durationInSeconds)
            })
          } catch {
            fallbackCache.set(key, body, durationInSeconds)
          }
        }
        return originalJson(body)
      }

      next()
    } catch {
      // Redis unavailable — use fallback cache
      const fallbackKey = `fallback:${key}`
      const fallbackCached = fallbackCache.get(fallbackKey)
      if (fallbackCached) {
        res.json(fallbackCached)
        return
      }

      const originalJson = res.json.bind(res)
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          fallbackCache.set(fallbackKey, body, durationInSeconds)
        }
        return originalJson(body)
      }

      next()
    }
  }
}

/**
 * Invalidate cache by pattern.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    await cacheService.deletePattern(pattern)
  } catch {
    // Fallback: clear NodeCache
    fallbackCache.flushAll()
  }
}

/**
 * Cache invalidation middleware for write operations.
 */
export function cacheInvalidation(pattern: string) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    const originalJson = _res.json.bind(_res)
    _res.json = (body: any) => {
      if (_res.statusCode >= 200 && _res.statusCode < 300) {
        invalidateCache(pattern).catch(() => {})
      }
      return originalJson(body)
    }
    next()
  }
}

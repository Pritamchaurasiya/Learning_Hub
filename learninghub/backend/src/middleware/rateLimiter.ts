import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../services/CacheService'
import logger from '../utils/logger'

export interface RateLimiterConfig {
  windowMs: number
  max: number
  keyPrefix?: string
  message?: string
}

interface MemoryLimitRecord {
  count: number
  resetTime: number
}

const memoryStore = new Map<string, MemoryLimitRecord>()
const MAX_MEMORY_STORE_SIZE = 5000
const EVICTION_TARGET = 0.2
const CLEANUP_INTERVAL_MS = 60_000
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null

const startCleanupInterval = (): void => {
  if (cleanupIntervalId) return
  cleanupIntervalId = setInterval(() => {
    pruneExpiredMemoryRecords()
  }, CLEANUP_INTERVAL_MS)
  if (typeof cleanupIntervalId === 'object' && 'unref' in cleanupIntervalId) {
    cleanupIntervalId.unref()
  }
}

const stopCleanupInterval = (): void => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
  }
}

const pruneExpiredMemoryRecords = (now = Date.now()): void => {
  const expiredKeys: string[] = []
  for (const [key, record] of memoryStore) {
    if (now >= record.resetTime) {
      expiredKeys.push(key)
    }
  }
  for (const key of expiredKeys) {
    memoryStore.delete(key)
  }

  if (memoryStore.size > MAX_MEMORY_STORE_SIZE * 0.8) {
    const entriesToEvict = Math.ceil(memoryStore.size * EVICTION_TARGET)
    let evicted = 0
    for (const [key] of memoryStore) {
      if (evicted >= entriesToEvict) break
      memoryStore.delete(key)
      evicted++
    }
  }
}

startCleanupInterval()

const getMemoryLimitRecord = (key: string, windowMs: number, now: number): MemoryLimitRecord => {
  const existing = memoryStore.get(key)

  if (!existing || now >= existing.resetTime) {
    if (memoryStore.size >= MAX_MEMORY_STORE_SIZE) {
      pruneExpiredMemoryRecords(now)
    }
    if (memoryStore.size >= MAX_MEMORY_STORE_SIZE) {
      return { count: 1, resetTime: now + windowMs }
    }
    const record = { count: 1, resetTime: now + windowMs }
    memoryStore.set(key, record)
    return record
  }

  existing.count++
  return existing
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded
    return rawIp.split(',')[0].trim()
  }
  return req.ip ?? req.socket.remoteAddress ?? '127.0.0.1'
}

export function createRateLimiter(config: RateLimiterConfig) {
  const { windowMs, max, keyPrefix = 'rl', message } = config

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (process.env.RATE_LIMIT_ENABLED === 'false' || (process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_ENABLED !== 'true')) {
      next()
      return
    }

    const userId = req.user?.userId
    const clientIp = getClientIp(req)
    const route = req.originalUrl || req.path

    const identifier = userId ? `user:${userId}` : `ip:${clientIp}`
    const key = `rate_limit:${keyPrefix}:${identifier}:${route}`

    let current = 0
    let resetTime = new Date(Date.now() + windowMs)
    let isRedisUsed = false

    try {
      const incrementResult = await cacheService.incrementWithExpiry(key, 1, windowMs)
      if (incrementResult > 0) {
        current = incrementResult
        isRedisUsed = true
      }
    } catch (err) {
      logger.warn('[RateLimiter] Redis unavailable, falling back to In-Memory', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    if (!isRedisUsed) {
      const now = Date.now()
      pruneExpiredMemoryRecords(now)
      const record = getMemoryLimitRecord(key, windowMs, now)
      current = record.count
      resetTime = new Date(record.resetTime)
    }

    const remaining = Math.max(0, max - current)
    const resetTimeSeconds = Math.ceil(resetTime.getTime() / 1000)

    res.set('X-RateLimit-Limit', max.toString())
    res.set('X-RateLimit-Remaining', remaining.toString())
    res.set('X-RateLimit-Reset', resetTimeSeconds.toString())

    if (current > max) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      res.set('Retry-After', retryAfter.toString())

      logger.warn(
        `[RateLimiter] Limit exceeded for key: ${key}. IP: ${clientIp}, User: ${userId ?? 'anonymous'}`
      )

      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: message ?? `Too many requests. Please try again in ${retryAfter} seconds.`,
        ...(req.requestId && { requestId: req.requestId }),
        details: {
          retryAfter,
          limit: max,
          remaining: 0,
        },
      })
      return
    }

    next()
  }
}

export function stopMemoryStoreCleanup(): void {
  stopCleanupInterval()
}

export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyPrefix: 'global',
  message: 'Too many requests from this IP, please try again after 15 minutes.',
})

export const strictLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyPrefix: 'auth',
  message: 'Too many attempts. Please try again after 10 minutes.',
})

export const mfaLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 attempts
  keyPrefix: 'mfa',
  message: 'Too many MFA attempts. Please try again after 5 minutes.',
})

export default createRateLimiter

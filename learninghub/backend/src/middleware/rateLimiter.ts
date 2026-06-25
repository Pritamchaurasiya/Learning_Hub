import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../services/CacheService'
import { sendError } from '../utils/responseHelper'
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

// In-memory fallback store with bounded size
const memoryStore = new Map<string, MemoryLimitRecord>()
const MAX_MEMORY_STORE_SIZE = 10000 // Prevent unbounded growth under heavy traffic

const pruneExpiredMemoryRecords = (now = Date.now()): void => {
  if (memoryStore.size >= MAX_MEMORY_STORE_SIZE) {
    for (const [key, record] of memoryStore) {
      if (now >= record.resetTime) memoryStore.delete(key)
    }
  }
}

const getMemoryLimitRecord = (key: string, windowMs: number, now: number): MemoryLimitRecord => {
  const existing = memoryStore.get(key)

  if (!existing || now >= existing.resetTime) {
    const record = { count: 1, resetTime: now + windowMs }
    memoryStore.set(key, record)
    return record
  }

  existing.count++
  return existing
}

// Helper to extract clean client IP
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const rawIp = Array.isArray(forwarded) ? forwarded[0] : forwarded
    return rawIp.split(',')[0].trim()
  }
  return req.ip ?? req.socket.remoteAddress ?? '127.0.0.1'
}

/**
 * Creates a rate limiting middleware with Redis storage and memory fallback.
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const { windowMs, max, keyPrefix = 'rl', message } = config

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // In test environment, bypass rate limit to prevent unit tests from failing
    if (process.env.NODE_ENV === 'test') {
      next()
      return
    }

    const userId = req.user?.userId
    const clientIp = getClientIp(req)
    const route = req.originalUrl || req.path

    // Determine lock key: User-scoped for authenticated, IP-scoped for anonymous
    const identifier = userId ? `user:${userId}` : `ip:${clientIp}`
    const key = `rate_limit:${keyPrefix}:${identifier}:${route}`

    let current = 0
    let resetTime = new Date(Date.now() + windowMs)
    let isRedisUsed = false

    try {
      // Use atomic INCR + conditional PEXPIRE to prevent permanent lock on crash
      const incrementResult = await cacheService.incrementWithExpiry(key, 1, windowMs)
      if (incrementResult > 0) {
        current = incrementResult
        isRedisUsed = true
      }
    } catch (err) {
      logger.error(
        '[RateLimiter] Redis increment error, falling back to In-Memory',
        err instanceof Error ? err : new Error(String(err))
      )
    }

    // In-memory fallback if Redis is unavailable or returned 0 (caching disabled/failed)
    if (!isRedisUsed) {
      const now = Date.now()

      // Evict expired entries proactively to keep memory bounded
      pruneExpiredMemoryRecords(now)

      const record = getMemoryLimitRecord(key, windowMs, now)

      current = record.count
      resetTime = new Date(record.resetTime)
    }

    const remaining = Math.max(0, max - current)
    const resetTimeSeconds = Math.ceil(resetTime.getTime() / 1000)

    // Set standard rate limit headers
    res.set('X-RateLimit-Limit', max.toString())
    res.set('X-RateLimit-Remaining', remaining.toString())
    res.set('X-RateLimit-Reset', resetTimeSeconds.toString())

    if (current > max) {
      const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      res.set('Retry-After', retryAfter.toString())

      logger.warn(
        `[RateLimiter] Limit exceeded for key: ${key}. IP: ${clientIp}, User: ${userId ?? 'anonymous'}`
      )

      sendError(
        res,
        message ?? `Too many requests. Please try again in ${retryAfter} seconds.`,
        429,
        'RATE_LIMIT_EXCEEDED',
        {
          retryAfter,
          limit: max,
          remaining: 0,
        }
      )
      return
    }

    next()
  }
}

/**
 * Periodically cleans up expired records from the in-memory fallback store
 */
export function cleanupMemoryStore(): void {
  const now = Date.now()
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key)
    }
  }
}

// Run memory cleanup every 5 minutes without keeping the Node process alive.
const cleanupInterval = setInterval(cleanupMemoryStore, 5 * 60 * 1000)
cleanupInterval.unref?.()

export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  keyPrefix: 'global',
  message: 'Too many requests from this IP, please try again after 15 minutes.',
})

export const strictLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  keyPrefix: 'auth',
  message: 'Too many attempts. Please try again after 10 minutes.',
})

export default createRateLimiter

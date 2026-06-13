import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/responseHelper'

interface UserRateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
}

interface RateLimitRecord {
  userId: string
  endpoint: string
  requestCount: number
  windowStart: Date
  windowEnd: Date
}

const userRateLimitStore = new Map<string, RateLimitRecord>()

export function createUserRateLimit(config: UserRateLimitConfig) {
  const { windowMs, maxRequests, message } = config

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.userId
    if (!userId) {
      next()
      return
    }

    const endpoint = req.originalUrl || req.path
    const key = `${userId}:${endpoint}`

    const now = new Date()
    const record = userRateLimitStore.get(key)

    if (!record || now > record.windowEnd) {
      userRateLimitStore.set(key, {
        userId,
        endpoint,
        requestCount: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + windowMs),
      })
      next()
      return
    }

    record.requestCount++

    if (record.requestCount > maxRequests) {
      sendError(
        res,
        message ??
          `Too many requests. Try again in ${Math.ceil((record.windowEnd.getTime() - now.getTime()) / 1000)} seconds`,
        429,
        'RATE_LIMIT_EXCEEDED'
      )
      return
    }

    res.set('X-RateLimit-Limit', maxRequests.toString())
    res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - record.requestCount).toString())
    res.set('X-RateLimit-Reset', record.windowEnd.getTime().toString())

    next()
  }
}

export async function getUserRateLimitStatus(
  userId: string,
  maxRequests: number = 100
): Promise<{
  endpoints: Array<{ endpoint: string; remaining: number; limit: number; resetAt: Date }>
}> {
  const now = new Date()
  const endpoints: Array<{ endpoint: string; remaining: number; limit: number; resetAt: Date }> = []

  for (const [, record] of userRateLimitStore.entries()) {
    if (record.userId === userId && now <= record.windowEnd) {
      endpoints.push({
        endpoint: record.endpoint,
        remaining: Math.max(0, maxRequests - record.requestCount),
        limit: maxRequests,
        resetAt: record.windowEnd,
      })
    }
  }

  return { endpoints }
}

export function cleanupExpiredRateLimits(): void {
  const now = new Date()
  for (const [key, record] of userRateLimitStore.entries()) {
    if (now > record.windowEnd) {
      userRateLimitStore.delete(key)
    }
  }
}

const cleanupInterval = setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000)
cleanupInterval.unref?.()

export default createUserRateLimit

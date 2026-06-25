import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'
import { cacheService } from '../services/CacheService'

export const cacheMiddleware = (durationInSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache public GET requests. Several optional-auth routes include
    // per-user flags (enrollment, completion, attempt counts) and mount this
    // middleware before optionalAuth, so a bearer request must not reuse the
    // anonymous response.
    if (req.method !== 'GET' || (req.headers.authorization && !req.user?.userId)) {
      next()
      return
    }

    // Use full URL as the cache key.
    // If the endpoint is specific to a user, this might leak data.
    // So we append the userId if present to ensure user-scoped caching where needed.
    const key = `__express__${req.originalUrl || req.url}_${req.user?.userId ?? 'anonymous'}`

    try {
      const cachedResponse = await cacheService.get(key)
      if (cachedResponse) {
        if (process.env.NODE_ENV !== 'test') {
          logger.info(`[Cache] HIT for ${key}`)
        }
        res.json(cachedResponse)
        return
      }
    } catch (err) {
      logger.warn(`[Cache] Redis get failed, continuing without cache for ${key}`)
    }

    if (process.env.NODE_ENV !== 'test') {
      logger.info(`[Cache] MISS for ${key}`)
    }

    // Override res.json to capture and cache the payload before sending
    const originalJson = res.json.bind(res)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json = (body: any) => {
      // Only cache success responses (assuming status 200)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(key, body, durationInSeconds).catch(err => {
          logger.error(`[Cache] Redis set failed for ${key}`, err as Error)
        })
      }
      return originalJson(body)
    }

    next()
  }
}

export const clearCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await cacheService.deletePattern('__express__*')
    if (process.env.NODE_ENV !== 'test') {
      logger.info('[Cache] Cleared all express cache entries')
    }
  } catch (err) {
    logger.error('[Cache] Failed to clear cache entries', err as Error)
  }
  next()
}

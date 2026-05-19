import NodeCache from 'node-cache'
import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

// Default TTL: 5 minutes (300 seconds)
export const apiCache = new NodeCache({ stdTTL: 300, checkperiod: 120 })

export const cacheMiddleware = (durationInSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next()
      return
    }

    // Use full URL as the cache key.
    // If the endpoint is specific to a user, this might leak data.
    // So we append the userId if present to ensure user-scoped caching where needed.
    const key = `__express__${req.originalUrl || req.url}_${req.user?.userId ?? 'anonymous'}`

    const cachedResponse = apiCache.get(key)
    if (cachedResponse) {
      if (process.env.NODE_ENV !== 'test') {
        logger.info(`[Cache] HIT for ${key}`)
      }
      res.json(cachedResponse)
      return
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
        apiCache.set(key, body, durationInSeconds)
      }
      return originalJson(body)
    }

    next()
  }
}

export const clearCache = (req: Request, res: Response, next: NextFunction): void => {
  apiCache.flushAll()
  if (process.env.NODE_ENV !== 'test') {
    logger.info('[Cache] Cleared all cache entries')
  }
  next()
}

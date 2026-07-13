import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import logger from '../utils/logger'

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers['x-request-id'] as string) || `${Date.now()}-${crypto.randomUUID()}`
  req.requestId = id
  res.setHeader('X-Request-ID', id)
  next()
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }

    if (res.statusCode >= 500) {
      logger.error('Request completed with error', new Error(`HTTP ${res.statusCode}`), logData)
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData)
    } else {
      logger.info('Request completed', logData)
    }
  })

  next()
}

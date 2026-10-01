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
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
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

// Request body size limiter middleware
export const bodySizeLimiter = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > maxSize) {
      res.status(413).json({
        status: 'error',
        message: 'Request entity too large',
        code: 'PAYLOAD_TOO_LARGE',
      })
      return
    }
    next()
  }
}

// Request compression middleware
export const responseCompression = (req: Request, res: Response, next: NextFunction): void => {
  // Skip compression for already compressed responses
  const acceptEncoding = req.headers['accept-encoding'] || ''
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next()
  }

  // Skip if already compressed
  if (res.getHeader('Content-Encoding')) {
    return next()
  }

  // Skip for already compressed content types
  const contentType = res.getHeader('Content-Type')
  if (contentType && typeof contentType === 'string') {
    const compressedTypes = ['image/', 'video/', 'audio/', 'application/zip', 'application/gzip', 'application/x-gzip']
    if (compressedTypes.some(type => contentType.startsWith(type))) {
      return next()
    }
  }

  // For JSON responses, we let express handle compression
  next()
}

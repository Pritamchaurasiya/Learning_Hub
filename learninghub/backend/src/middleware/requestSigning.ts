import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'
import { sendError } from '../utils/responseHelper'

const SIGNING_SECRET = process.env.REQUEST_SIGNING_SECRET ?? ''
const SIGNATURE_HEADER = 'x-request-signature'
const TIMESTAMP_HEADER = 'x-request-timestamp'
const TIMESTAMP_MAX_AGE_MS = 5 * 60 * 1000

const SENSITIVE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function computeHmac(payload: string, timestamp: string, secret: string): string {
  const data = `${timestamp}:${payload}`
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

export const requestSigning = (req: Request, res: Response, next: NextFunction): void => {
  if (!SENSITIVE_METHODS.has(req.method)) {
    next()
    return
  }

  if (!SIGNING_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('REQUEST_SIGNING_SECRET not set in production')
      sendError(res, 'Server configuration error', 500, 'CONFIG_ERROR')
      return
    }
    next()
    return
  }

  const signature = req.headers[SIGNATURE_HEADER] as string | undefined
  const timestamp = req.headers[TIMESTAMP_HEADER] as string | undefined

  if (!signature || !timestamp) {
    sendError(res, 'Missing request signature', 401, 'MISSING_SIGNATURE')
    return
  }

  const timestampMs = parseInt(timestamp, 10)
  if (isNaN(timestampMs) || Date.now() - timestampMs > TIMESTAMP_MAX_AGE_MS) {
    sendError(res, 'Request timestamp expired', 401, 'TIMESTAMP_EXPIRED')
    return
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  const expected = computeHmac(rawBody, timestamp, SIGNING_SECRET)

  if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
    logger.warn('Invalid request signature', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    })
    sendError(res, 'Invalid request signature', 401, 'INVALID_SIGNATURE')
    return
  }

  next()
}

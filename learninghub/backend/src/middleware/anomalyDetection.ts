import { Request, Response, NextFunction } from 'express'
import { cacheService } from '../services/CacheService'
import logger from '../utils/logger'
import { sendError } from '../utils/responseHelper'

const ANOMALY_CONFIG = {
  failedAuthWindowMs: 15 * 60 * 1000,
  failedAuthThreshold: 20,
  blockDurationSeconds: 15 * 60,
  suspiciousPathWindowMs: 60 * 1000,
  suspiciousPathThreshold: 50,
  portScanWindowMs: 60 * 1000,
  portScanThreshold: 10,
}

export const trackFailedAuth = async (ip: string): Promise<void> => {
  const key = `anomaly:auth-fail:${ip}`
  const count = await cacheService.incrementWithExpiry(key, 1, ANOMALY_CONFIG.failedAuthWindowMs)

  if (count >= ANOMALY_CONFIG.failedAuthThreshold) {
    const blockKey = `anomaly:block:${ip}`
    await cacheService.set(blockKey, 'brute-force', ANOMALY_CONFIG.blockDurationSeconds)

    logger.warn('IP blocked due to brute force detection', {
      ip,
      failedAttempts: count,
      blockDuration: ANOMALY_CONFIG.blockDurationSeconds,
    })
  }
}

export const clearFailedAuth = async (ip: string): Promise<void> => {
  await cacheService.delete(`anomaly:auth-fail:${ip}`)
}

const isIPBlocked = async (ip: string): Promise<boolean> => {
  const block = await cacheService.get<string>(`anomaly:block:${ip}`)
  return block !== null
}

export const anomalyDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'

  if (await isIPBlocked(ip)) {
    logger.warn('Blocked request from flagged IP', { ip, path: req.path, method: req.method })
    sendError(res, 'Too many requests. Please try again later.', 429, 'IP_TEMPORARILY_BLOCKED')
    return
  }

  const pathKey = `anomaly:path:${ip}`
  const pathCount = await cacheService.incrementWithExpiry(
    pathKey,
    1,
    ANOMALY_CONFIG.suspiciousPathWindowMs
  )

  if (pathCount >= ANOMALY_CONFIG.suspiciousPathThreshold) {
    const blockKey = `anomaly:block:${ip}`
    await cacheService.set(blockKey, 'suspicious-activity', ANOMALY_CONFIG.blockDurationSeconds)

    logger.warn('IP blocked due to suspicious activity pattern', {
      ip,
      requestCount: pathCount,
      window: ANOMALY_CONFIG.suspiciousPathWindowMs,
    })

    sendError(
      res,
      'Too many requests. Please try again later.',
      429,
      'SUSPICIOUS_ACTIVITY_DETECTED'
    )
    return
  }

  next()
}

export const getAnomalyConfig = () => ({ ...ANOMALY_CONFIG })

import { Request, Response } from 'express'
import { distributedRateLimiterService } from '../services/DistributedRateLimiterService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class DistributedRateLimiterController {
  public evaluateRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { algorithm, key, capacity, refillRate, windowSeconds, cost } = req.body

      const rateKey = (key as string) || 'client:default:ip_127_0_0_1'
      let verdict

      switch (algorithm) {
        case 'LEAKY_BUCKET':
          verdict = distributedRateLimiterService.evaluateLeakyBucket(
            rateKey,
            capacity ? Number(capacity) : 20,
            refillRate ? Number(refillRate) : 5
          )
          break
        case 'SLIDING_WINDOW_COUNTER':
          verdict = distributedRateLimiterService.evaluateSlidingWindowCounter(
            rateKey,
            capacity ? Number(capacity) : 60,
            windowSeconds ? Number(windowSeconds) : 60
          )
          break
        case 'TOKEN_BUCKET':
        default:
          verdict = distributedRateLimiterService.evaluateTokenBucket(
            rateKey,
            capacity ? Number(capacity) : 20,
            refillRate ? Number(refillRate) : 5,
            cost ? Number(cost) : 1
          )
          break
      }

      sendSuccess(res, { verdict })
    } catch (error: any) {
      logger.error('[DistributedRateLimiterController] evaluateRequest error:', error)
      sendError(res, error.message || 'Failed to evaluate rate limit', 500)
    }
  }

  public simulateRaceCondition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { concurrency, capacity } = req.body
      const result = distributedRateLimiterService.simulateRaceCondition(
        concurrency ? Number(concurrency) : 100,
        capacity ? Number(capacity) : 15
      )
      sendSuccess(res, { result })
    } catch (error: any) {
      logger.error('[DistributedRateLimiterController] simulateRaceCondition error:', error)
      sendError(res, error.message || 'Failed to simulate race condition', 500)
    }
  }

  public updateAdaptiveConcurrency = async (req: Request, res: Response): Promise<void> => {
    try {
      const { measuredRttMs } = req.body
      const state = distributedRateLimiterService.updateAdaptiveConcurrency(
        measuredRttMs ? Number(measuredRttMs) : 25.0
      )
      sendSuccess(res, { state })
    } catch (error: any) {
      logger.error('[DistributedRateLimiterController] updateAdaptiveConcurrency error:', error)
      sendError(res, error.message || 'Failed to update adaptive concurrency', 500)
    }
  }

  public getAdaptiveState = async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = distributedRateLimiterService.getAdaptiveState()
      sendSuccess(res, { state })
    } catch (error: any) {
      logger.error('[DistributedRateLimiterController] getAdaptiveState error:', error)
      sendError(res, error.message || 'Failed to get adaptive state', 500)
    }
  }

  public getAuditSnapshot = async (_req: Request, res: Response): Promise<void> => {
    try {
      const snapshot = distributedRateLimiterService.getAuditSnapshot()
      sendSuccess(res, { snapshot })
    } catch (error: any) {
      logger.error('[DistributedRateLimiterController] getAuditSnapshot error:', error)
      sendError(res, error.message || 'Failed to get audit snapshot', 500)
    }
  }

  public reset = async (_req: Request, res: Response): Promise<void> => {
    try {
      distributedRateLimiterService.reset()
      const snapshot = distributedRateLimiterService.getAuditSnapshot()
      sendSuccess(res, { snapshot })
    } catch (error: any) {
      logger.error('[DistributedRateLimiterController] reset error:', error)
      sendError(res, error.message || 'Failed to reset rate limiter simulation', 500)
    }
  }
}

export const distributedRateLimiterController = new DistributedRateLimiterController()

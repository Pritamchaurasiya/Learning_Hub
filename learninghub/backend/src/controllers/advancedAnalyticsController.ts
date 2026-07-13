import { Request, Response } from 'express'
import { advancedAnalyticsService } from '../services/AdvancedAnalyticsService'
import { sendSuccess, sendUnauthorized, sendError } from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'
import { asyncHandler } from '../utils/errorHandler'

function parseDaysParam(req: Request): number {
  const raw = req.query.days
  if (typeof raw !== 'string') return 30
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed < 1) return 30
  return Math.min(parsed, 365)
}

function parseLimitParam(req: Request): number {
  const raw = req.query.limit
  if (typeof raw !== 'string') return 10
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed) || parsed < 1) return 10
  return Math.min(parsed, 100)
}

export const getDailyActiveUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const days = parseDaysParam(req)
    const cacheKey = `analytics:dau:${days}`
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      sendSuccess(res, cached)
      return
    }
    const data = await advancedAnalyticsService.getDailyActiveUsers(days)
    await cacheService.set(cacheKey, data, 300)
    sendSuccess(res, data)
  }
)

export const getTestAttemptTrend = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const days = parseDaysParam(req)
    const data = await advancedAnalyticsService.getTestAttemptTrend(days)
    sendSuccess(res, data)
  }
)

export const getCohortRetention = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const rawWeeks = req.query.weeks
    const weeks =
      typeof rawWeeks === 'string' ? Math.min(Math.max(parseInt(rawWeeks, 10) || 8, 1), 52) : 8
    const cacheKey = `analytics:cohort:${weeks}`
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      sendSuccess(res, cached)
      return
    }
    const data = await advancedAnalyticsService.getCohortRetention(weeks)
    await cacheService.set(cacheKey, data, 600)
    sendSuccess(res, data)
  }
)

export const getLearningPatterns = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const data = await advancedAnalyticsService.getLearningPatternsByHour()
    sendSuccess(res, data)
  }
)

export const getTestCompletionFunnel = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const testId = req.params.testId
    if (!testId || typeof testId !== 'string') {
      sendError(res, 'Valid test ID is required', 400, 'VALIDATION_ERROR')
      return
    }
    const data = await advancedAnalyticsService.getTestCompletionFunnel(testId)
    sendSuccess(res, data)
  }
)

export const getTopTests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const limit = parseLimitParam(req)
  const data = await advancedAnalyticsService.getTopTestsByEngagement(limit)
  sendSuccess(res, data)
})

export const getUserVelocity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    sendUnauthorized(res)
    return
  }
  const userId = req.user.userId
  const days = parseDaysParam(req)
  const data = await advancedAnalyticsService.getUserLearningVelocity(userId, days)
  sendSuccess(res, data)
})

import { Request, Response } from 'express'
import { advancedAnalyticsService } from '../services/AdvancedAnalyticsService'
import {
  sendSuccess,
  sendUnauthorized,
  sendError,
  sendInternalError,
} from '../utils/responseHelper'
import { cacheService } from '../services/CacheService'
import logger from '../utils/logger'

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.user?.userId) {
    sendUnauthorized(res)
    return false
  }
  const role = (req.user as Record<string, unknown>).role as string | undefined
  if (!role || (role !== 'ADMIN' && role !== 'SUPERADMIN')) {
    sendError(res, 'Admin access required', 403, 'FORBIDDEN')
    return false
  }
  return true
}

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

export async function getDailyActiveUsers(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
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
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getDailyActiveUsers error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export async function getEnrollmentTrend(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    const days = parseDaysParam(req)
    const data = await advancedAnalyticsService.getEnrollmentTrend(days)
    sendSuccess(res, data)
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getEnrollmentTrend error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export async function getCohortRetention(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
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
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getCohortRetention error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export async function getLearningPatterns(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    const data = await advancedAnalyticsService.getLearningPatternsByHour()
    sendSuccess(res, data)
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getLearningPatterns error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export async function getCourseCompletionFunnel(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    const courseId = req.params.courseId
    if (!courseId || typeof courseId !== 'string') {
      sendError(res, 'Valid course ID is required', 400, 'VALIDATION_ERROR')
      return
    }
    const data = await advancedAnalyticsService.getCourseCompletionFunnel(courseId)
    sendSuccess(res, data)
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getCourseCompletionFunnel error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export async function getTopCourses(req: Request, res: Response): Promise<void> {
  try {
    if (!requireAdmin(req, res)) return
    const limit = parseLimitParam(req)
    const data = await advancedAnalyticsService.getTopCoursesByEngagement(limit)
    sendSuccess(res, data)
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getTopCourses error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export async function getUserVelocity(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      sendUnauthorized(res)
      return
    }
    const userId = req.user.userId
    const days = parseDaysParam(req)
    const data = await advancedAnalyticsService.getUserLearningVelocity(userId, days)
    sendSuccess(res, data)
  } catch (error) {
    logger.error(
      'AdvancedAnalytics getUserVelocity error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

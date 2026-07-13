import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { aiTestService } from '../services/AITestService'
import { cacheService } from '../services/CacheService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendUnauthorized } from '../utils/responseHelper'

const clampDays = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : fallback
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : fallback
}

const formatDateKey = (date: Date): string => date.toISOString().split('T')[0]

/**
 * GET /api/v1/analytics/dashboard
 * Get learner-facing dashboard stats from persisted progress and test data.
 */
export const getLearnerDashboardStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const cacheKey = cacheService.generateKey('dashboard', 'stats', userId)
    const cachedStats = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const [user, testStats, topicStats] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { xp: true, level: true, streak: true, longestStreak: true },
          }),
          prisma.testResult.aggregate({
            where: { userId, status: 'COMPLETED' },
            _avg: { percentage: true },
          }),
          prisma.topicPerformance.findMany({
            where: { userId },
            select: {
              topicName: true,
              subjectName: true,
              totalAttempts: true,
              correctAnswers: true,
              accuracy: true,
            },
          }),
        ])

        if (!user) {
          throw new Error('User not found')
        }

        return {
          total_tests: 0, // Placeholder
          total_learning_time: 0, // Placeholder if no daily goals exist

          average_score: Math.round(testStats._avg.percentage ?? 0),
          current_streak: user.streak,
          longest_streak: user.longestStreak,
          xp_points: user.xp,
          level: user.level,
          topic_performance: topicStats.map((tp: any) => ({
            topic: tp.topicName,
            subject: tp.subjectName,
            attempts: tp.totalAttempts,
            accuracy: tp.accuracy,
          })),
        }
      },
      60 // 1 minute TTL avoids DB spikes while feeling real-time
    )

    sendSuccess(res, cachedStats)
  }
)

/**
 * GET /api/v1/analytics/learning-activity
 * Get daily activity that can be derived safely from learner-owned records.
 */
export const getLearningActivity = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = clampDays(req.query.days, 30)
    const cacheKey = cacheService.generateKey('dashboard', 'activity', userId, days)
    const cachedActivity = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = new Date()
        startDate.setUTCHours(0, 0, 0, 0)
        startDate.setUTCDate(startDate.getUTCDate() - (days - 1))

        const [goals, tests] = await Promise.all([
          prisma.dailyGoal.findMany({
            where: { userId, date: { gte: startDate } },
            select: { date: true, completedMinutes: true },
          }),
          prisma.testResult.findMany({
            where: { userId, status: 'COMPLETED', completedAt: { gte: startDate } },
            select: { completedAt: true, passed: true, score: true },
          }),
        ])

        const activity = new Map<
          string,
          {
            date: string
            time_spent: number
            xp_earned: number
            tests_completed: number
          }
        >()

        for (let offset = 0; offset < days; offset++) {
          const date = new Date(startDate)
          date.setUTCDate(date.getUTCDate() + offset)
          const key = formatDateKey(date)
          activity.set(key, {
            date: key,
            time_spent: 0,
            xp_earned: 0,
            tests_completed: 0,
          })
        }

        for (const goal of goals) {
          const row = activity.get(formatDateKey(goal.date))
          if (row) row.time_spent += goal.completedMinutes
        }

        for (const result of tests) {
          if (!result.completedAt) continue
          const row = activity.get(formatDateKey(result.completedAt))
          if (row) {
            row.tests_completed++
            if (result.passed) row.xp_earned += Math.round(result.score)
          }
        }

        return Array.from(activity.values())
      },
      300 // 5 minutes TTL
    )

    sendSuccess(res, cachedActivity)
  }
)

/**
 * GET /api/v1/analytics/performance-trend
 * Get user's performance trend over time for chart visualization.
 */
export const getPerformanceTrend = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = clampDays(req.query.days, 30)
    const cacheKey = cacheService.generateKey('dashboard', 'trend', userId, days)

    const trend = await cacheService.getOrSet(
      cacheKey,
      () => queryOptimizationService.getPerformanceTrend(userId, days),
      300 // 5 minutes TTL
    )

    sendSuccess(res, trend)
  }
)

/**
 * GET /api/v1/analytics/weak-areas
 * Get user's weak areas for targeted practice.
 */
export const getWeakAreas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    sendUnauthorized(res)
    return
  }

  const cacheKey = cacheService.topicWeakKey(userId)
  const weakTopics = await cacheService.getOrSet(
    cacheKey,
    () => aiTestService.getWeakTopics(userId),
    300 // 5 mins TTL
  )

  sendSuccess(res, { weak_areas: weakTopics })
})

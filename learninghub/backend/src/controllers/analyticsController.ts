import { Request, Response } from 'express'
import logger from '../utils/logger'
import { prisma } from '../prismaClient'
import { queryOptimizationService } from '../services/QueryOptimizationService'
import { aiTestService } from '../services/AITestService'
import {
  sendSuccess,
  sendUnauthorized,
  sendNotFound,
  sendInternalError,
} from '../utils/responseHelper'

const clampDays = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : fallback
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 365) : fallback
}

const formatDateKey = (date: Date): string => date.toISOString().split('T')[0]

/**
 * GET /api/v1/analytics/dashboard
 * Get learner-facing dashboard stats from persisted progress and test data.
 */
export const getLearnerDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const [user, progress, testStats, topicStats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true, streak: true, longestStreak: true },
      }),
      prisma.userProgress.findMany({
        where: { userId },
        select: { status: true, timeSpentSeconds: true },
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
      sendNotFound(res, 'User not found')
      return
    }

    const totalLearningSeconds = progress.reduce(
      (total, record) => total + record.timeSpentSeconds,
      0
    )

    sendSuccess(res, {
      total_courses: progress.length,
      completed_courses: progress.filter(record => record.status === 'COMPLETED').length,
      in_progress_courses: progress.filter(record => record.status === 'IN_PROGRESS').length,
      total_learning_time: Math.round(totalLearningSeconds / 60),
      average_score: Math.round(testStats._avg.percentage ?? 0),
      current_streak: user.streak,
      longest_streak: user.longestStreak,
      xp_points: user.xp,
      level: user.level,
      topic_performance: topicStats.map(tp => ({
        topic: tp.topicName,
        subject: tp.subjectName,
        attempts: tp.totalAttempts,
        accuracy: tp.accuracy,
      })),
    })
  } catch (error) {
    logger.error(
      '[AnalyticsController] getLearnerDashboardStats error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /api/v1/analytics/learning-activity
 * Get daily activity that can be derived safely from learner-owned records.
 */
export const getLearningActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = clampDays(req.query.days, 30)
    const startDate = new Date()
    startDate.setUTCHours(0, 0, 0, 0)
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1))

    const [goals, lessonCompletions, tests, progressActivity] = await Promise.all([
      prisma.dailyGoal.findMany({
        where: { userId, date: { gte: startDate } },
        select: { date: true, completedMinutes: true },
      }),
      prisma.lessonCompletion.findMany({
        where: { userId, completedAt: { gte: startDate } },
        select: { completedAt: true },
      }),
      prisma.testResult.findMany({
        where: { userId, status: 'COMPLETED', completedAt: { gte: startDate } },
        select: { completedAt: true, passed: true, score: true },
      }),
      prisma.userProgress.findMany({
        where: { userId, lastActivityAt: { gte: startDate } },
        select: { lastActivityAt: true },
      }),
    ])

    const activity = new Map<
      string,
      {
        date: string
        courses_accessed: number
        lessons_completed: number
        time_spent: number
        xp_earned: number
      }
    >()

    for (let offset = 0; offset < days; offset++) {
      const date = new Date(startDate)
      date.setUTCDate(date.getUTCDate() + offset)
      const key = formatDateKey(date)
      activity.set(key, {
        date: key,
        courses_accessed: 0,
        lessons_completed: 0,
        time_spent: 0,
        xp_earned: 0,
      })
    }

    for (const goal of goals) {
      const row = activity.get(formatDateKey(goal.date))
      if (row) row.time_spent += goal.completedMinutes
    }

    for (const completion of lessonCompletions) {
      const row = activity.get(formatDateKey(completion.completedAt))
      if (row) row.lessons_completed++
    }

    for (const result of tests) {
      if (!result.completedAt) continue
      const row = activity.get(formatDateKey(result.completedAt))
      if (row && result.passed) row.xp_earned += Math.round(result.score)
    }

    for (const progress of progressActivity) {
      const row = activity.get(formatDateKey(progress.lastActivityAt))
      if (row) row.courses_accessed++
    }

    sendSuccess(res, Array.from(activity.values()))
  } catch (error) {
    logger.error(
      '[AnalyticsController] getLearningActivity error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /api/v1/analytics/performance-trend
 * Get user's performance trend over time for chart visualization.
 */
export const getPerformanceTrend = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const days = clampDays(req.query.days, 30)
    const trend = await queryOptimizationService.getPerformanceTrend(userId, days)

    sendSuccess(res, trend)
  } catch (error) {
    logger.error(
      '[AnalyticsController] getPerformanceTrend error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /api/v1/analytics/weak-areas
 * Get user's weak areas for targeted practice.
 */
export const getWeakAreas = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const weakTopics = await aiTestService.getWeakTopics(userId)

    sendSuccess(res, { weak_areas: weakTopics })
  } catch (error) {
    logger.error(
      '[AnalyticsController] getWeakAreas error',
      error instanceof Error ? error : new Error(String(error)),
      { userId: req.user?.userId }
    )
    sendInternalError(res)
  }
}

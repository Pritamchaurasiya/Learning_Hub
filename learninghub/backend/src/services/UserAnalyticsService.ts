/**
 * UserAnalyticsService
 *
 * Per-user analytics engine. Provides actionable insights:
 *  - Accuracy trend over time
 *  - Speed trend (avg time per question)
 *  - Topic mastery overview
 *  - Weak/strong area detection
 *  - Growth score (composite metric)
 *  - Study activity analysis
 *  - Performance comparison vs previous periods
 */

import { prisma } from '../prismaClient'
import { topicPerformanceService } from './TopicPerformanceService'
import logger from '../utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AccuracyTrendPoint {
  date: string
  accuracy: number
  testsCompleted: number
}

export interface SpeedTrendPoint {
  date: string
  avgTimePerQuestion: number
  questionsAnswered: number
}

export interface GrowthMetrics {
  growthScore: number          // 0-100 composite score
  accuracyDelta: number        // Change vs previous period
  speedDelta: number           // Change vs previous period
  consistencyScore: number     // Based on daily activity
  topicsImproved: number       // Topics that went up in strength
  topicsDegraded: number       // Topics that went down
}

export interface UserDashboardAnalytics {
  summary: {
    totalTestsCompleted: number
    totalQuestionsAnswered: number
    overallAccuracy: number
    averageScore: number
    passRate: number
    totalStudyTimeMinutes: number
    currentStreak: number
    longestStreak: number
  }
  accuracyTrend: AccuracyTrendPoint[]
  speedTrend: SpeedTrendPoint[]
  topicMastery: Awaited<ReturnType<typeof topicPerformanceService.getTopicMasteryMap>>
  growth: GrowthMetrics
  recentActivity: {
    date: string
    type: string
    description: string
  }[]
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class UserAnalyticsService {
  /**
   * Get comprehensive dashboard analytics for a user.
   */
  async getDashboardAnalytics(
    userId: string,
    days: number = 30
  ): Promise<UserDashboardAnalytics> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      summary,
      accuracyTrend,
      speedTrend,
      topicMastery,
      growth,
      recentActivity,
    ] = await Promise.all([
      this.getSummary(userId, startDate),
      this.getAccuracyTrend(userId, days),
      this.getSpeedTrend(userId, days),
      topicPerformanceService.getTopicMasteryMap(userId),
      this.getGrowthMetrics(userId, days),
      this.getRecentActivity(userId, 20),
    ])

    return {
      summary,
      accuracyTrend,
      speedTrend,
      topicMastery,
      growth,
      recentActivity,
    }
  }

  /**
   * Summary metrics for the period.
   */
  private async getSummary(userId: string, startDate: Date) {
    const [results, user] = await Promise.all([
      prisma.testResult.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: startDate },
        },
        select: {
          percentage: true,
          passed: true,
          timeTaken: true,
          score: true,
          totalPoints: true,
          questionResults: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          streak: true,
          longestStreak: true,
        },
      }),
    ])

    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const avgScore = totalTests > 0
      ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
      : 0
    const totalTimeSeconds = results.reduce((sum, r) => sum + r.timeTaken, 0)

    // Count total questions answered
    let totalQuestions = 0
    let totalCorrect = 0
    for (const result of results) {
      const qResults = Array.isArray(result.questionResults)
        ? result.questionResults as any[]
        : []
      totalQuestions += qResults.length
      totalCorrect += qResults.filter((qr: any) => qr.is_correct).length
    }

    return {
      totalTestsCompleted: totalTests,
      totalQuestionsAnswered: totalQuestions,
      overallAccuracy: totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0,
      averageScore: avgScore,
      passRate: totalTests > 0
        ? Math.round((passedTests / totalTests) * 100)
        : 0,
      totalStudyTimeMinutes: Math.round(totalTimeSeconds / 60),
      currentStreak: user?.streak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
    }
  }

  /**
   * Accuracy trend over time — grouped by day.
   */
  async getAccuracyTrend(
    userId: string,
    days: number = 30
  ): Promise<AccuracyTrendPoint[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const results = await prisma.testResult.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      select: {
        percentage: true,
        completedAt: true,
      },
      orderBy: { completedAt: 'asc' },
    })

    // Group by day
    const dailyMap = new Map<string, { total: number; sum: number }>()
    for (const r of results) {
      if (!r.completedAt) continue
      const date = r.completedAt.toISOString().split('T')[0]
      const existing = dailyMap.get(date) ?? { total: 0, sum: 0 }
      existing.total++
      existing.sum += r.percentage
      dailyMap.set(date, existing)
    }

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      accuracy: Math.round(stats.sum / stats.total),
      testsCompleted: stats.total,
    }))
  }

  /**
   * Speed trend — average time per question, grouped by day.
   */
  async getSpeedTrend(
    userId: string,
    days: number = 30
  ): Promise<SpeedTrendPoint[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const results = await prisma.testResult.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: { gte: startDate },
      },
      select: {
        timeTaken: true,
        completedAt: true,
        questionResults: true,
      },
      orderBy: { completedAt: 'asc' },
    })

    const dailyMap = new Map<string, { totalTime: number; totalQuestions: number }>()
    for (const r of results) {
      if (!r.completedAt) continue
      const date = r.completedAt.toISOString().split('T')[0]
      const qResults = Array.isArray(r.questionResults) ? r.questionResults as any[] : []
      const existing = dailyMap.get(date) ?? { totalTime: 0, totalQuestions: 0 }
      existing.totalTime += r.timeTaken
      existing.totalQuestions += qResults.length
      dailyMap.set(date, existing)
    }

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      avgTimePerQuestion: stats.totalQuestions > 0
        ? Math.round(stats.totalTime / stats.totalQuestions)
        : 0,
      questionsAnswered: stats.totalQuestions,
    }))
  }

  /**
   * Growth metrics — compare current period to previous period.
   */
  async getGrowthMetrics(
    userId: string,
    days: number = 30
  ): Promise<GrowthMetrics> {
    const now = Date.now()
    const currentStart = new Date(now - days * 24 * 60 * 60 * 1000)
    const previousStart = new Date(now - 2 * days * 24 * 60 * 60 * 1000)

    const [currentResults, previousResults] = await Promise.all([
      prisma.testResult.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: { gte: currentStart },
        },
        select: { percentage: true, timeTaken: true, questionResults: true },
      }),
      prisma.testResult.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: previousStart,
            lt: currentStart,
          },
        },
        select: { percentage: true, timeTaken: true, questionResults: true },
      }),
    ])

    const currentAvg = currentResults.length > 0
      ? currentResults.reduce((s, r) => s + r.percentage, 0) / currentResults.length
      : 0
    const previousAvg = previousResults.length > 0
      ? previousResults.reduce((s, r) => s + r.percentage, 0) / previousResults.length
      : 0

    const currentAvgTime = this.avgTimePerQuestion(currentResults)
    const previousAvgTime = this.avgTimePerQuestion(previousResults)

    // Consistency: how many unique days had test activity
    const activeDays = new Set(
      currentResults
        .map(r => (r as any).completedAt?.toISOString?.()?.split('T')?.[0])
        .filter(Boolean)
    ).size
    const consistencyScore = Math.min(100, Math.round((activeDays / days) * 100 * 3))

    // Growth score composite: accuracy improvement (40%) + consistency (30%) + speed improvement (30%)
    const accuracyDelta = currentAvg - previousAvg
    const speedDelta = previousAvgTime - currentAvgTime // Positive = faster
    const accuracyComponent = Math.min(40, Math.max(0, (accuracyDelta + 20) * 2))
    const consistencyComponent = consistencyScore * 0.3
    const speedComponent = Math.min(30, Math.max(0, (speedDelta + 10) * 1.5))
    const growthScore = Math.round(accuracyComponent + consistencyComponent + speedComponent)

    return {
      growthScore: Math.max(0, Math.min(100, growthScore)),
      accuracyDelta: Math.round(accuracyDelta * 100) / 100,
      speedDelta: Math.round(speedDelta * 100) / 100,
      consistencyScore,
      topicsImproved: 0, // Will be calculated when we have historical topic data
      topicsDegraded: 0,
    }
  }

  /**
   * Recent activity log for the user.
   */
  async getRecentActivity(
    userId: string,
    limit: number = 20
  ): Promise<{ date: string; type: string; description: string }[]> {
    const activities = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        activityType: true,
        createdAt: true,
        entityType: true,
        metadata: true,
      },
    })

    return activities.map(a => ({
      date: a.createdAt.toISOString(),
      type: a.activityType,
      description: this.formatActivityDescription(a.activityType, a.entityType, a.metadata),
    }))
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private avgTimePerQuestion(results: { timeTaken: number; questionResults: any }[]): number {
    let totalTime = 0
    let totalQuestions = 0
    for (const r of results) {
      const qResults = Array.isArray(r.questionResults) ? r.questionResults as any[] : []
      totalTime += r.timeTaken
      totalQuestions += qResults.length
    }
    return totalQuestions > 0 ? totalTime / totalQuestions : 0
  }

  private formatActivityDescription(
    type: string,
    entityType: string | null,
    _metadata: any
  ): string {
    const descriptions: Record<string, string> = {
      LOGIN: 'Logged in',
      LOGOUT: 'Logged out',
      REGISTER: 'Created account',
      COURSE_ENROLL: `Enrolled in ${entityType === 'course' ? 'a course' : 'content'}`,
      COURSE_START: 'Started a course',
      COURSE_COMPLETE: 'Completed a course',
      LESSON_START: 'Started a lesson',
      LESSON_COMPLETE: 'Completed a lesson',
      QUIZ_START: 'Started a test',
      QUIZ_COMPLETE: 'Completed a test',
      QUIZ_ABANDON: 'Abandoned a test',
      BOOKMARK_ADD: 'Added a bookmark',
      BOOKMARK_REMOVE: 'Removed a bookmark',
      NOTE_CREATE: 'Created a note',
      ACHIEVEMENT_UNLOCK: 'Unlocked an achievement',
      STREAK_MILESTONE: 'Reached a streak milestone',
      PROFILE_UPDATE: 'Updated profile',
      SETTINGS_UPDATE: 'Updated settings',
    }
    return descriptions[type] ?? `Activity: ${type}`
  }
}

export const userAnalyticsService = new UserAnalyticsService()

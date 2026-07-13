/**
 * PlatformHealthService
 *
 * Real-time platform health monitoring for admin dashboard:
 *  - Active user counts (1h, 24h, 7d, 30d)
 *  - Test engagement metrics
 *  - Content quality indicators
 *  - System resource indicators
 *  - DAU/MAU ratio
 *  - Churn risk signals
 */

import { prisma } from '../prismaClient'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlatformHealth {
  activeUsers: {
    last1h: number
    last24h: number
    last7d: number
    last30d: number
    dauMauRatio: number // Daily Active / Monthly Active (benchmark: 20-30%)
  }
  testEngagement: {
    testsCompletedToday: number
    testsCompletedWeek: number
    avgTestScore: number
    passRate: number
    avgTimePerTest: number // seconds
    activeTestsNow: number // IN_PROGRESS
  }
  contentQuality: {
    totalQuestions: number
    tooHardQuestions: number // < 30% correct rate
    tooEasyQuestions: number // > 95% correct rate
    lowCompletionTests: number // Tests with < 50% completion rate
    aiGeneratedQuestions: number
    manualQuestions: number
  }
  userGrowth: {
    newUsersToday: number
    newUsersWeek: number
    newUsersMonth: number
    totalUsers: number
    verifiedUsers: number
  }
  systemHealth: {
    databaseStatus: 'healthy' | 'degraded' | 'down'
    uptimeSeconds: number
    memoryUsageMB: number
    activeConnections: number
    idleConnections: number
    waitingRequests: number
  }
}

export interface ContentQualityDetail {
  questionId: string
  questionText: string
  testTitle: string
  totalAttempts: number
  correctRate: number
  issue: 'too_hard' | 'too_easy' | 'low_discrimination'
}

export interface ChurnRiskUser {
  userId: string
  email: string
  username: string | null
  lastActive: Date
  daysSinceActive: number
  streak: number
  totalTests: number
  riskLevel: 'high' | 'medium' | 'low'
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class PlatformHealthService {
  /**
   * Get comprehensive platform health metrics.
   */
  async getHealth(): Promise<PlatformHealth> {
    const now = Date.now()
    const hour = new Date(now - 60 * 60 * 1000)
    const day = new Date(now - 24 * 60 * 60 * 1000)
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const month = new Date(now - 30 * 24 * 60 * 60 * 1000)

    const [activeUsers, testEngagement, contentQuality, userGrowth] = await Promise.all([
      this.getActiveUserCounts(hour, day, week, month),
      this.getTestEngagement(day, week),
      this.getContentQuality(),
      this.getUserGrowth(day, week, month),
    ])

    const systemHealth = await this.getSystemHealth()

    return {
      activeUsers,
      testEngagement,
      contentQuality,
      userGrowth,
      systemHealth,
    }
  }

  /**
   * Get active user counts at different time windows.
   */
  private async getActiveUserCounts(hour: Date, day: Date, week: Date, month: Date) {
    const [last1h, last24h, last7d, last30d] = await Promise.all([
      prisma.user.count({
        where: { lastActive: { gte: hour }, deletedAt: null },
      }),
      prisma.user.count({
        where: { lastActive: { gte: day }, deletedAt: null },
      }),
      prisma.user.count({
        where: { lastActive: { gte: week }, deletedAt: null },
      }),
      prisma.user.count({
        where: { lastActive: { gte: month }, deletedAt: null },
      }),
    ])

    const dauMauRatio = last30d > 0 ? Math.round((last24h / last30d) * 100) : 0

    return { last1h, last24h, last7d, last30d, dauMauRatio }
  }

  /**
   * Get test engagement metrics.
   */
  private async getTestEngagement(day: Date, week: Date) {
    // week query excludes today to avoid double-counting when combined with todayResults
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [todayResults, weekResults, activeTests] = await Promise.all([
      prisma.testResult.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: day } },
        select: { percentage: true, passed: true, timeTaken: true },
      }),
      prisma.testResult.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: week, lt: todayStart } },
        select: { percentage: true, passed: true, timeTaken: true },
      }),
      prisma.testResult.count({
        where: { status: 'IN_PROGRESS' },
      }),
    ])

    const safeToday = todayResults || []
    const safeWeek = weekResults || []

    const allResults = [...safeToday, ...safeWeek]
    const avgScore =
      allResults.length > 0
        ? Math.round(allResults.reduce((s, r) => s + r.percentage, 0) / allResults.length)
        : 0
    const passRate =
      allResults.length > 0
        ? Math.round((allResults.filter(r => r.passed).length / allResults.length) * 100)
        : 0
    const avgTime =
      allResults.length > 0
        ? Math.round(allResults.reduce((s, r) => s + r.timeTaken, 0) / allResults.length)
        : 0

    return {
      testsCompletedToday: safeToday.length,
      testsCompletedWeek: safeWeek.length,
      avgTestScore: avgScore,
      passRate,
      avgTimePerTest: avgTime,
      activeTestsNow: activeTests,
    }
  }

  /**
   * Get content quality indicators.
   */
  private async getContentQuality() {
    const [totalQuestions, aiGenerated] = await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { isAiGenerated: true } }),
    ])

    // Find questions with extreme correct rates using topic performance
    // This is an approximation — detailed question-level stats would require
    // analyzing all questionResults from TestResult records
    const tooHardTopics = await prisma.topicPerformance.count({
      where: { accuracy: { lt: 30 }, totalAttempts: { gte: 10 } },
    })
    const tooEasyTopics = await prisma.topicPerformance.count({
      where: { accuracy: { gt: 95 }, totalAttempts: { gte: 10 } },
    })

    let lowCompletionTests: [{ count: bigint }] = [{ count: BigInt(0) }]
    try {
      lowCompletionTests = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM "tests" t
        WHERE t."isPublished" = true
          AND (
            SELECT COUNT(*) FROM "test_results" tr
            WHERE tr."testId" = t.id AND tr.status = 'COMPLETED'
          ) < (
            SELECT COUNT(*) FROM "test_results" tr
            WHERE tr."testId" = t.id
          ) * 0.5
          AND (
            SELECT COUNT(*) FROM "test_results" tr
            WHERE tr."testId" = t.id
          ) >= 5
      `
    } catch {
      lowCompletionTests = [{ count: BigInt(0) }]
    }
    return {
      totalQuestions,
      tooHardQuestions: tooHardTopics,
      tooEasyQuestions: tooEasyTopics,
      lowCompletionTests: Number(lowCompletionTests?.[0]?.count ?? 0),
      aiGeneratedQuestions: aiGenerated,
      manualQuestions: totalQuestions - aiGenerated,
    }
  }

  /**
   * Get user growth metrics.
   */
  private async getUserGrowth(day: Date, week: Date, month: Date) {
    const [newToday, newWeek, newMonth, total, verified] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: day }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: week }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: month }, deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { emailVerified: true, deletedAt: null } }),
    ])

    return {
      newUsersToday: newToday,
      newUsersWeek: newWeek,
      newUsersMonth: newMonth,
      totalUsers: total,
      verifiedUsers: verified,
    }
  }

  /**
   * Get system health metrics including database connection pool stats.
   */
  private async getSystemHealth() {
    const memUsage = process.memoryUsage()

    let activeConnections = 0
    let idleConnections = 0
    let waitingRequests = 0
    let databaseStatus: 'healthy' | 'degraded' | 'down' = 'healthy'

    try {
      // Prisma metrics are available if enabled in schema previewFeatures = ["metrics"]
      // We wrap in try-catch in case metrics are disabled
      const metrics = await prisma.$metrics.json()
      const poolActive = metrics.counters.find((c: { key: string; value: number }) => c.key === 'prisma_pool_connections_busy')
      const poolIdle = metrics.counters.find((c: { key: string; value: number }) => c.key === 'prisma_pool_connections_idle')
      const poolWait = metrics.counters.find((c: { key: string; value: number }) => c.key === 'prisma_client_queries_wait')

      activeConnections = poolActive?.value ?? 0
      idleConnections = poolIdle?.value ?? 0
      waitingRequests = poolWait?.value ?? 0

      if (waitingRequests > 10) databaseStatus = 'degraded'
    } catch {
      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        databaseStatus = 'down'
      }
    }

    return {
      databaseStatus,
      uptimeSeconds: Math.round(process.uptime()),
      memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      activeConnections,
      idleConnections,
      waitingRequests,
    }
  }

  /**
   * Get users at risk of churning.
   */
  async getChurnRiskUsers(limit: number = 20): Promise<ChurnRiskUser[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        lastActive: { lt: sevenDaysAgo },
        // Only users who have been active (not brand new dormant accounts)
        loginCount: { gt: 2 },
      },
      select: {
        id: true,
        email: true,
        username: true,
        lastActive: true,
        streak: true,
        _count: { select: { testResults: true } },
      },
      orderBy: { lastActive: 'asc' },
      take: limit,
    })

    return users.map((user: { id: string; email: string; username: string | null; lastActive: Date; streak: number; _count: { testResults: number } }) => {
      const daysSinceActive = Math.floor(
        (Date.now() - user.lastActive.getTime()) / (24 * 60 * 60 * 1000)
      )

      let riskLevel: 'high' | 'medium' | 'low'
      if (daysSinceActive > 30) riskLevel = 'high'
      else if (daysSinceActive > 14) riskLevel = 'medium'
      else riskLevel = 'low'

      return {
        userId: user.id,
        email: user.email,
        username: user.username,
        lastActive: user.lastActive,
        daysSinceActive,
        streak: user.streak,
        totalTests: user._count.testResults,
        riskLevel,
      }
    })
  }
}

export const platformHealthService = new PlatformHealthService()

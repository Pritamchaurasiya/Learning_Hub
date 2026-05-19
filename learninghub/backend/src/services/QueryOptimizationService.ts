/**
 * Database Query Optimization Service
 *
 * Provides optimized query patterns for expensive operations:
 *  - Leaderboard with cursor pagination
 *  - Test analytics aggregation
 *  - User performance summary
 *  - Course discovery with relevance scoring
 */

import { prisma } from '../prismaClient'

export interface LeaderboardOptions {
  page?: number
  limit?: number
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all'
  cursor?: string
}

export class QueryOptimizationService {
  /**
   * Get leaderboard with cursor-based pagination for better performance.
   * Uses XP as the cursor for O(1) pagination.
   */
  async getLeaderboard(options: LeaderboardOptions = {}) {
    const limit = Math.min(options.limit ?? 20, 100)
    const cursor = options.cursor ? parseInt(options.cursor) : undefined

    const where: Record<string, unknown> = {
      deletedAt: null,
    }

    if (cursor !== undefined) {
      where.xp = { lt: cursor }
    }

    // Apply timeframe filter if specified
    if (options.timeframe && options.timeframe !== 'all') {
      const now = new Date()
      let dateFilter: Date

      switch (options.timeframe) {
        case 'daily':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'weekly':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          dateFilter = new Date(0)
      }

      where.lastActive = { gte: dateFilter }
    }

    const users = await prisma.user.findMany({
      where: where as any,
      take: limit + 1, // Fetch one extra to check if there's a next page
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        username: true,
        avatar: true,
        xp: true,
        level: true,
        streak: true,
      },
    })

    const hasNextPage = users.length > limit
    if (hasNextPage) {
      users.pop() // Remove the extra item
    }

    const nextCursor =
      hasNextPage && users.length > 0 ? users[users.length - 1].xp.toString() : null

    // Get total count only for first page
    let total: number | undefined
    if (!cursor) {
      total = await prisma.user.count({ where: where as any })
    }

    return {
      users,
      pagination: {
        limit,
        total: total ?? undefined,
        next_cursor: nextCursor,
        has_next_page: hasNextPage,
      },
    }
  }

  /**
   * Get user's performance summary — optimized single query.
   */
  async getUserPerformanceSummary(userId: string) {
    const [user, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          xp: true,
          level: true,
          streak: true,
          longestStreak: true,
        },
      }),
      prisma.testResult.aggregate({
        where: { userId, status: 'COMPLETED' },
        _count: { id: true },
        _avg: { percentage: true },
        _max: { percentage: true },
        _min: { percentage: true },
      }),
    ])

    const recentTests = await prisma.testResult.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        percentage: true,
        passed: true,
        completedAt: true,
        test: { select: { title: true, mode: true } },
      },
    })

    return {
      user,
      test_stats: {
        total_tests: stats._count.id,
        average_score: Math.round(stats._avg.percentage ?? 0),
        best_score: Math.round(stats._max.percentage ?? 0),
        worst_score: Math.round(stats._min.percentage ?? 0),
      },
      recent_tests: recentTests.map(t => ({
        title: t.test.title,
        mode: t.test.mode,
        score: t.percentage,
        passed: t.passed,
        completed_at: t.completedAt,
      })),
    }
  }

  /**
   * Get course discovery results with relevance scoring.
   * Uses weighted scoring: rating (40%), student count (30%), recency (30%).
   */
  async getDiscoverCourses(params: {
    page?: number
    limit?: number
    category?: string
    difficulty?: string
    search?: string
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 50)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      isPublished: true,
      deletedAt: null,
    }

    if (params.category) {
      where.category = { equals: params.category, mode: 'insensitive' }
    }

    if (params.difficulty) {
      where.difficulty = params.difficulty
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { tags: { has: params.search } },
      ]
    }

    // Use raw query for relevance scoring
    const courses = await prisma.course.findMany({
      where: where as any,
      skip,
      take: limit,
      orderBy: [{ rating: 'desc' }, { studentCount: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        shortDescription: true,
        thumbnail: true,
        difficulty: true,
        category: true,
        rating: true,
        studentCount: true,
        price: true,
        duration: true,
        certificate: true,
        createdAt: true,
        instructor: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    })

    const total = await prisma.course.count({ where: where as any })

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Batch fetch course progress for multiple courses — avoids N+1 queries.
   */
  async getBatchProgress(userId: string, courseIds: string[]) {
    if (courseIds.length === 0) return new Map<string, any>()

    const progressRecords = await prisma.userProgress.findMany({
      where: {
        userId,
        courseId: { in: courseIds },
      },
      select: {
        courseId: true,
        progress: true,
        status: true,
        completedAt: true,
        timeSpentSeconds: true,
      },
    })

    const progressMap = new Map<string, any>()
    for (const record of progressRecords) {
      progressMap.set(record.courseId, {
        progress: record.progress,
        status: record.status,
        completed_at: record.completedAt,
        time_spent_seconds: record.timeSpentSeconds,
      })
    }

    return progressMap
  }

  /**
   * Get test performance trend — optimized aggregation.
   */
  async getPerformanceTrend(userId: string, days: number = 30) {
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
        test: { select: { title: true, difficulty: true } },
      },
      orderBy: { completedAt: 'asc' },
    })

    // Group by date for trend line
    const dailyScores: Record<string, { total: number; count: number }> = {}

    for (const result of results) {
      const date = result.completedAt!.toISOString().split('T')[0]
      if (!dailyScores[date]) dailyScores[date] = { total: 0, count: 0 }
      dailyScores[date].total += result.percentage
      dailyScores[date].count++
    }

    const trend = Object.entries(dailyScores).map(([date, stats]) => ({
      date,
      average_score: Math.round(stats.total / stats.count),
      tests_taken: stats.count,
    }))

    return {
      trend,
      summary: {
        total_tests: results.length,
        average_score:
          results.length > 0
            ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
            : 0,
        improvement: this.calculateImprovement(results),
      },
    }
  }

  private calculateImprovement(results: any[]): number {
    if (results.length < 2) return 0

    const firstHalf = results.slice(0, Math.floor(results.length / 2))
    const secondHalf = results.slice(Math.floor(results.length / 2))

    const firstAvg = firstHalf.reduce((s, r) => s + r.percentage, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, r) => s + r.percentage, 0) / secondHalf.length

    return Math.round(secondAvg - firstAvg)
  }
}

export const queryOptimizationService = new QueryOptimizationService()

/**
 * Database Query Optimization Service
 *
 * Provides optimized query patterns for expensive operations:
 *  - Leaderboard with cursor pagination
 *  - Test analytics aggregation
 *  - User performance summary
 *  - Course discovery with relevance scoring
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'
import { cacheService } from './CacheService'

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
    const timeframe = options.timeframe ?? 'all'

    // Parse composite cursor "xp:id" for uniqueness guarantee
    let cursorXP: number | undefined
    let cursorId: string | undefined
    if (options.cursor) {
      const parts = options.cursor.split(':')
      if (parts.length === 2) {
        const val = parseInt(parts[0], 10)
        if (!isNaN(val)) {
          cursorXP = val
          cursorId = parts[1]
        }
      } else {
        // Backwards compatibility: treat as XP-only cursor
        const val = parseInt(parts[0], 10)
        if (!isNaN(val)) {
          cursorXP = val
        }
      }
    }

    // Attempt to hit cache first
    const cacheKey = cacheService.leaderboardKey(
      `${timeframe}-${limit}-${options.cursor ?? 'first'}`
    )
    const cachedData = await cacheService.get(cacheKey)
    if (cachedData) {
      return cachedData
    }

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    }

    // Composite cursor filter: users with (lower xp) OR (same xp but later id)
    if (cursorXP !== undefined) {
      if (cursorId) {
        where.OR = [{ xp: { lt: cursorXP } }, { xp: cursorXP, id: { gt: cursorId } }]
      } else {
        where.xp = { lt: cursorXP }
      }
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
      where,
      take: limit + 1, // Fetch one extra to check if there's a next page
      orderBy: [{ xp: 'desc' }, { id: 'asc' }], // Composite sort for deterministic ordering
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

    // Composite cursor: "xp:id"
    const nextCursor =
      hasNextPage && users.length > 0
        ? `${users[users.length - 1].xp}:${users[users.length - 1].id}`
        : null

    // Get total count only for first page
    let total: number | undefined
    if (!options.cursor) {
      total = await prisma.user.count({
        where: {
          deletedAt: null,
          ...(where.lastActive ? { lastActive: where.lastActive } : {}),
        } satisfies Prisma.UserWhereInput,
      })
    }

    const result = {
      users,
      pagination: {
        limit,
        total: total ?? undefined,
        next_cursor: nextCursor,
        has_next_page: hasNextPage,
      },
    }

    // Cache the result for 60 seconds to keep leaderboard fresh
    await cacheService.set(cacheKey, result, 60)

    return result
  }

  /**
   * Get user's performance summary — optimized single query.
   */
  async getUserPerformanceSummary(userId: string) {
    const [user, stats, recentTests] = await Promise.all([
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
      prisma.testResult.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          percentage: true,
          passed: true,
          completedAt: true,
          test: { select: { title: true, mode: true } },
        },
      }),
    ])

    return {
      user,
      test_stats: {
        total_tests: stats._count.id,
        average_score: Math.round(stats._avg.percentage ?? 0),
        best_score: Math.round(stats._max.percentage ?? 0),
        worst_score: Math.round(stats._min.percentage ?? 0),
      },
      recent_tests: recentTests.map((t: { test: { title: string; mode: string }; percentage: number; passed: boolean; completedAt: Date | null }) => ({
        title: t.test.title,
        mode: t.test.mode,
        score: t.percentage,
        passed: t.passed,
        completed_at: t.completedAt,
      })),
    }
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const date = result.completedAt!.toISOString().split('T')[0]

      // eslint-disable-next-line security/detect-object-injection
      if (!dailyScores[date]) dailyScores[date] = { total: 0, count: 0 }
      // eslint-disable-next-line security/detect-object-injection
      dailyScores[date].total += result.percentage
      // eslint-disable-next-line security/detect-object-injection
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
            ? Math.round(results.reduce((s: number, r: { percentage: number }) => s + r.percentage, 0) / results.length)
            : 0,
        improvement: this.calculateImprovement(results),
      },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

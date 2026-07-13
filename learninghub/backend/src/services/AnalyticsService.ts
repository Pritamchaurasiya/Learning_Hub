/**
 * Analytics Service
 *
 * Provides aggregated analytics for admin dashboard and user insights:
 *  - Platform-wide metrics
 *  - Revenue analytics
 *  - User growth trends
 *  - Course performance
 *  - Test engagement
 *  - Audit log viewer
 */

import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'
import { cacheService } from './CacheService'

export class AnalyticsService {
  /**
   * Get comprehensive platform analytics for admin dashboard.
   * Caches results for 1 hour to prevent DB saturation.
   */
  async getPlatformAnalytics(days: number = 30) {
    const cacheKey = cacheService.generateKey('analytics', 'platform', days)
    const ttl = 3600 + crypto.randomInt(0, 300) // Jitter: 1 hr + up to 5 mins

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const [totalUsers, newUsers, activeUsers, totalTests, totalTestAttempts] =
          await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.user.count({ where: { createdAt: { gte: startDate }, deletedAt: null } }),
            prisma.user.count({
              where: {
                lastActive: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                deletedAt: null,
              },
            }),
            prisma.test.count({ where: { isPublished: true } }),
            prisma.testResult.count({ where: { status: 'COMPLETED' } }),
          ])

        return {
          overview: {
            total_users: totalUsers,
            new_users_period: newUsers,
            active_users_24h: activeUsers,
            total_tests: totalTests,
            total_test_attempts: totalTestAttempts,
          },
          growth: await this.getUserGrowthTrend(days),
          engagement: await this.getEngagementMetrics(startDate),
          top_tests: await this.getTopTests(),
        }
      },
      ttl,
      true // disableMemoryFallback
    )
  }

  /**
   * Get user growth trend over time.
   */
  private async getUserGrowthTrend(days: number) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    // Use raw query for efficient date truncation and grouping (PostgreSQL specific)
    const growth = await prisma.$queryRaw<{ date: string; new_users: number }[]>`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM-DD') as date, 
        COUNT(*)::int as new_users
      FROM "users"
      WHERE "createdAt" >= ${startDate} AND "deletedAt" IS NULL
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
      ORDER BY date ASC
    `
    return growth
  }

  /**
   * Get engagement metrics.
   */
  private async getEngagementMetrics(startDate: Date) {
    const [aggregate, passedCount] = await Promise.all([
      prisma.testResult.aggregate({
        where: { completedAt: { gte: startDate }, status: 'COMPLETED' },
        _avg: { percentage: true },
        _count: { id: true },
      }),
      prisma.testResult.count({
        where: { completedAt: { gte: startDate }, status: 'COMPLETED', passed: true },
      }),
    ])

    const totalCompleted = aggregate._count.id
    const avgTestScore = aggregate._avg.percentage ? Math.round(aggregate._avg.percentage) : 0
    const passRate = totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 100) : 0

    return {
      tests_completed: totalCompleted,
      average_test_score: avgTestScore,
      pass_rate: passRate,
    }
  }

  /**
   * Get top performing tests.
   */
  private async getTopTests() {
    return prisma.test.findMany({
      where: { isPublished: true },
      orderBy: { results: { _count: 'desc' } },
      take: 10,
      select: {
        id: true,
        title: true,
        difficulty: true,
        mode: true,
      },
    })
  }

  /**
   * Get audit logs with filtering and pagination.
   */
  async getAuditLogs(params: {
    page?: number
    limit?: number
    userId?: string
    action?: string
    severity?: string
    entityType?: string
    startDate?: Date
    endDate?: Date
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(params.limit ?? 20, 100)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (params.userId) where.userId = params.userId
    if (params.action) where.action = params.action
    if (params.severity) where.severity = params.severity
    if (params.entityType) where.entityType = params.entityType
    if (params.startDate && params.endDate) {
      where.createdAt = { gte: params.startDate, lte: params.endDate }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: where as Prisma.AuditLogWhereInput,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: where as Prisma.AuditLogWhereInput }),
    ])

    return {
      logs: logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId,
        description: log.description,
        severity: log.severity,
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        created_at: log.createdAt,
        user: log.user
          ? {
              id: log.user.id,
              username: log.user.username,
              email: log.user.email,
              role: log.user.role,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get security events summary.
   * Caches results for 1 hour to prevent DB saturation.
   */
  async getSecurityEvents(days: number = 7) {
    const cacheKey = cacheService.generateKey('analytics', 'security', days)
    const ttl = 3600 + crypto.randomInt(0, 300) // Jitter

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const [failedLogins, roleChanges, deletions, passwordChanges] = await Promise.all([
          prisma.user.count({
            where: {
              failedLogins: { gt: 0 },
              lastLoginAt: { gte: startDate },
            },
          }),
          prisma.auditLog.count({
            where: {
              action: 'ROLE_CHANGE',
              createdAt: { gte: startDate },
            },
          }),
          prisma.auditLog.count({
            where: {
              action: 'DELETE',
              createdAt: { gte: startDate },
            },
          }),
          prisma.auditLog.count({
            where: {
              action: 'PASSWORD_CHANGE',
              createdAt: { gte: startDate },
            },
          }),
        ])

        return {
          failed_login_attempts: failedLogins,
          role_changes: roleChanges,
          account_deletions: deletions,
          password_changes: passwordChanges,
          period_days: days,
        }
      },
      ttl
    )
  }
}

export const analyticsService = new AnalyticsService()

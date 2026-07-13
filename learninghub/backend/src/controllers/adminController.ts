import { Request, Response } from 'express'
import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { getPaginationParams } from '../utils/pagination'
import { analyticsService } from '../services/AnalyticsService'
import { jobQueueService } from '../services/JobQueueService'
import { dataExportService } from '../services/DataExportService'
import { asyncHandler } from '../utils/errorHandler'
import {
  sendSuccess,
  sendForbidden,
  sendNotFound,
  sendValidationError,
} from '../utils/responseHelper'

/**
 * Get admin dashboard statistics
 * Includes: total users, active users, total courses, revenue metrics
 */
export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.user?.userId ?? ''

    logger.audit('ACCESS_DASHBOARD', adminId, { action: 'view_dashboard_stats' })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalUsers, activeUsers, newUsersToday, testSubmissions] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { lastActive: { gte: twentyFourHoursAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.testResult.count({
        where: { completedAt: { gte: twentyFourHoursAgo } },
      }),
    ])

    sendSuccess(res, {
      total_users: totalUsers,
      active_users_24h: activeUsers,
      new_users_today: newUsersToday,
      test_submissions_24h: testSubmissions,
      total_revenue: null,
      revenue_today: null,
      revenue_tracking_enabled: false,
    })
  }
)

/**
 * Get all users with pagination and search
 */
export const getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  const { search } = req.query
  const { page: parsedPage, limit: parsedLimit, skip } = getPaginationParams(req.query)

  logger.audit('ACCESS_USER_LIST', adminId, {
    page: parsedPage,
    search: search ? String(search) : undefined,
  })

  const where: Prisma.UserWhereInput = {}
  if (search) {
    where.OR = [
      { username: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        xp: true,
        streak: true,
        lastActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  sendSuccess(res, {
    users,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    },
  })
})

/**
 * Update user role (admin action with audit)
 */
export const updateUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string
  const { role } = req.body
  const adminId = req.user?.userId ?? ''

  const uppercaseRole = typeof role === 'string' ? role.toUpperCase() : ''
  if (!['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes(uppercaseRole)) {
    sendValidationError(res, 'Invalid role')
    return
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: uppercaseRole as UserRole },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
    },
  })

  logger.audit('UPDATE_USER_ROLE', adminId, { targetUserId: id, newRole: role })

  sendSuccess(res, user, 'User role updated successfully')
})

/**
 * Delete user (admin action with audit) — cascade-safe
 */
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string
  const adminId = req.user?.userId ?? ''

  if (id === adminId) {
    sendValidationError(res, 'Cannot delete your own account')
    return
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true, username: true },
  })
  if (!targetUser) {
    sendNotFound(res, 'User not found')
    return
  }
  if (
    (targetUser.role === 'ADMIN' || targetUser.role === 'SUPERADMIN') &&
    req.user?.role !== 'SUPERADMIN'
  ) {
    sendForbidden(res, 'Only SUPERADMIN can delete admin accounts')
    return
  }

  await prisma.$transaction([
    prisma.testResult.deleteMany({ where: { userId: id } }),
    prisma.userAchievement.deleteMany({ where: { userId: id } }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
    prisma.userSession.deleteMany({ where: { userId: id } }),
    prisma.auditLog.deleteMany({ where: { userId: id } }),
    prisma.notification.deleteMany({ where: { userId: id } }),
    prisma.dailyGoal.deleteMany({ where: { userId: id } }),
    prisma.activityLog.deleteMany({ where: { userId: id } }),
    prisma.problemSubmission.deleteMany({ where: { userId: id } }),
    prisma.topicPerformance.deleteMany({ where: { userId: id } }),
    prisma.questionBookmark.deleteMany({ where: { userId: id } }),
    prisma.verificationToken.deleteMany({ where: { userId: id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ])

  logger.audit('DELETE_USER', adminId, { targetUserId: id, targetUsername: targetUser.username })

  sendSuccess(res, null, 'User deleted successfully')
})

/**
 * Get system health/status
 */
export const getSystemStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  logger.audit('ACCESS_SYSTEM_STATUS', adminId, { action: 'view_system_health' })

  await prisma.$queryRaw`SELECT 1`

  sendSuccess(res, {
    database: 'connected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

/**
 * Get job queue health status
 */
export const getJobQueueHealth = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.user?.userId ?? ''
    const health = await jobQueueService.getQueueHealth()
    logger.audit('VIEW_QUEUE_HEALTH', adminId, {})
    sendSuccess(res, health)
  }
)

/**
 * Trigger GDPR data export for a user
 */
export const triggerDataExport = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.user?.userId ?? ''
    const userId = req.params.id as string
    const exportData = await dataExportService.generateUserExport(userId)
    logger.audit('TRIGGER_DATA_EXPORT', adminId, { targetUserId: userId })
    sendSuccess(res, exportData, 'Data export generated successfully')
  }
)

// ==================== COURSE MANAGEMENT ====================

/**
 * Get all courses with filters (admin view)
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  const days = req.query.days ? parseInt(req.query.days as string) : 30

  const [analytics, security] = await Promise.all([
    analyticsService.getPlatformAnalytics(days),
    analyticsService.getSecurityEvents(days),
  ])

  logger.audit('ACCESS_ANALYTICS', adminId, { days })

  sendSuccess(res, {
    ...analytics,
    security,
  })
})

/**
 * GET /admin/audit-logs
 * View audit logs with filtering.
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  const { page, limit, user_id, action, severity, entity_type, start_date, end_date } = req.query

  const logs = await analyticsService.getAuditLogs({
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    userId: user_id as string,
    action: action as string,
    severity: severity as string,
    entityType: entity_type as string,
    startDate: start_date ? new Date(start_date as string) : undefined,
    endDate: end_date ? new Date(end_date as string) : undefined,
  })

  logger.audit('VIEW_AUDIT_LOGS', adminId, { filters: req.query })

  sendSuccess(res, logs)
})

/**
 * GET /admin/security
 * View security events summary.
 */
export const getSecurityEvents = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.user?.userId ?? ''

    const days = req.query.days ? parseInt(req.query.days as string) : 7

    const events = await analyticsService.getSecurityEvents(days)

    logger.audit('VIEW_SECURITY', adminId, { days })

    sendSuccess(res, events)
  }
)

/**
 * Get user analytics breakdown
 */
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    sendForbidden(res)
    return
  }
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [byRole, recentUsers] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ])

  const growthMap = new Map<string, number>()
  recentUsers.forEach((u: any) => {
    const dateStr = u.createdAt.toISOString().split('T')[0]
    growthMap.set(dateStr, (growthMap.get(dateStr) ?? 0) + 1)
  })

  const growth = Array.from(growthMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  sendSuccess(res, {
    byRole: byRole.map((g: any) => ({ role: g.role, count: g._count.id })),
    growth,
  })
})

/**
 * Get Daily Active Users (DAU) analytics
 */
export const getDauAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    sendForbidden(res)
    return
  }

  const days = parseInt(req.query.days as string) || 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const activeUsers = await prisma.user.findMany({
    where: { updatedAt: { gte: startDate } },
    select: { updatedAt: true },
  })

  const dauMap = new Map<string, number>()

  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dauMap.set(d.toISOString().split('T')[0], 0)
  }

  activeUsers.forEach((u: any) => {
    const dateStr = u.updatedAt.toISOString().split('T')[0]
    if (dauMap.has(dateStr)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      dauMap.set(dateStr, dauMap.get(dateStr)! + 1)
    }
  })

  const dauData = Array.from(dauMap.entries())
    .map(([date, activeUsers]) => ({ date, activeUsers }))
    .sort((a, b) => a.date.localeCompare(b.date))

  sendSuccess(res, { data: dauData })
})

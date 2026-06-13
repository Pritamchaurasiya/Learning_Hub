import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { getPaginationParams } from '../utils/pagination'
import { analyticsService } from '../services/AnalyticsService'
import { jobQueueService } from '../services/JobQueueService'
import { dataExportService } from '../services/DataExportService'
import {
  sendSuccess,
  sendCreated,
  sendForbidden,
  sendNotFound,
  sendValidationError,
  sendInternalError,
} from '../utils/responseHelper'

/**
 * Get admin dashboard statistics
 * Includes: total users, active users, total courses, revenue metrics
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
    // Log dashboard access
    logger.audit('ACCESS_DASHBOARD', adminId, { action: 'view_dashboard_stats' })

    // Run all database count queries concurrently for performance
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalCourses,
      recentCompletions,
      totalEnrollments,
      testSubmissions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { lastActive: { gte: twentyFourHoursAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.course.count(),
      prisma.userProgress.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: twentyFourHoursAgo },
        },
      }),
      prisma.userProgress.count(),
      prisma.testResult.count({
        where: { completedAt: { gte: twentyFourHoursAgo } },
      }),
    ])

    sendSuccess(res, {
      total_users: totalUsers,
      active_users_24h: activeUsers,
      new_users_today: newUsersToday,
      total_courses: totalCourses,
      recent_completions: recentCompletions,
      total_enrollments: totalEnrollments,
      test_submissions_24h: testSubmissions,
      total_revenue: null,
      revenue_today: null,
      revenue_tracking_enabled: false,
    })
  } catch (error) {
    logger.error(
      'Admin getDashboardStats error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
      }
    )
    sendInternalError(res)
  }
}

/**
 * Get all users with pagination and search
 */
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
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
  } catch (error) {
    logger.error('Admin getUsers error', error instanceof Error ? error : new Error(String(error)))
    sendInternalError(res)
  }
}

/**
 * Update user role (admin action with audit)
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string
  const { role } = req.body
  const adminId = req.user?.userId ?? ''

  try {
    const uppercaseRole = role?.toUpperCase()
    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].includes(uppercaseRole)) {
      sendValidationError(res, 'Invalid role')
      return
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: uppercaseRole },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    })

    // Log admin action using audit logger
    logger.audit('UPDATE_USER_ROLE', adminId, { targetUserId: id, newRole: role })

    sendSuccess(res, user, 'User role updated successfully')
  } catch (error) {
    logger.error(
      'Admin updateUserRole error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
        targetUserId: id,
        newRole: role,
      }
    )
    sendInternalError(res)
  }
}

/**
 * Delete user (admin action with audit) — cascade-safe
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string
  const adminId = req.user?.userId ?? ''

  try {
    // Prevent self-deletion
    if (id === adminId) {
      sendValidationError(res, 'Cannot delete your own account')
      return
    }

    // Prevent non-superadmin from deleting admins (privilege escalation guard)
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

    // Cascade delete all dependent records in a transaction
    await prisma.$transaction([
      prisma.testResult.deleteMany({ where: { userId: id } }),
      prisma.lessonCompletion.deleteMany({ where: { userId: id } }),
      prisma.userProgress.deleteMany({ where: { userId: id } }),
      prisma.bookmark.deleteMany({ where: { userId: id } }),
      prisma.note.deleteMany({ where: { userId: id } }),
      prisma.userAchievement.deleteMany({ where: { userId: id } }),
      prisma.refreshToken.deleteMany({ where: { userId: id } }),
      prisma.userSession.deleteMany({ where: { userId: id } }),
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.dailyGoal.deleteMany({ where: { userId: id } }),
      prisma.activityLog.deleteMany({ where: { userId: id } }),
      prisma.problemSubmission.deleteMany({ where: { userId: id } }),
      prisma.courseReview.deleteMany({ where: { userId: id } }),
      prisma.topicPerformance.deleteMany({ where: { userId: id } }),
      prisma.questionBookmark.deleteMany({ where: { userId: id } }),
      prisma.contestParticipant.deleteMany({ where: { userId: id } }),
      prisma.verificationToken.deleteMany({ where: { userId: id } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
      prisma.mentorshipSession.deleteMany({ where: { OR: [{ userId: id }, { mentorId: id }] } }),
      prisma.user.delete({ where: { id } }),
    ])

    // Log admin action using audit logger
    logger.audit('DELETE_USER', adminId, { targetUserId: id, targetUsername: targetUser.username })

    sendSuccess(res, null, 'User deleted successfully')
  } catch (error) {
    logger.error(
      'Admin deleteUser error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
        targetUserId: id,
      }
    )
    sendInternalError(res)
  }
}

/**
 * Get system health/status
 */
export const getSystemStatus = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
    // Log system status access
    logger.audit('ACCESS_SYSTEM_STATUS', adminId, { action: 'view_system_health' })

    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    sendSuccess(res, {
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    logger.error(
      'Admin getSystemStatus error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
      }
    )
    sendInternalError(res, 'System check failed')
  }
}

/**
 * Get job queue health status
 */
export const getJobQueueHealth = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  try {
    const health = await jobQueueService.getQueueHealth()
    logger.audit('VIEW_QUEUE_HEALTH', adminId, {})
    sendSuccess(res, health)
  } catch (error) {
    logger.error('Admin getJobQueueHealth error', error as Error)
    sendInternalError(res, 'Failed to retrieve queue health')
  }
}

/**
 * Trigger GDPR data export for a user
 */
export const triggerDataExport = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const userId = req.params.id as string
  try {
    const exportData = await dataExportService.generateUserExport(userId)
    logger.audit('TRIGGER_DATA_EXPORT', adminId, { targetUserId: userId })
    sendSuccess(res, exportData, 'Data export generated successfully')
  } catch (error) {
    logger.error('Admin triggerDataExport error', error as Error)
    sendInternalError(res, 'Failed to generate data export')
  }
}

// ==================== COURSE MANAGEMENT ====================

/**
 * Get all courses with filters (admin view)
 */
export const getAdminCourses = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
    const { status, category, search, page = '1', limit = '20' } = req.query
    const parsedPage = Math.max(1, parseInt(page as string, 10))
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit as string, 10)))
    const skip = (parsedPage - 1) * parsedLimit

    const where: Prisma.CourseWhereInput = {}

    if (status && typeof status === 'string') {
      switch (status) {
        case 'published':
          where.isPublished = true
          break
        case 'draft':
          where.isPublished = false
          break
        case 'archived':
          where.deletedAt = { not: null }
          break
      }
    }

    if (category && typeof category === 'string') {
      where.category = { contains: category, mode: 'insensitive' }
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          difficulty: true,
          category: true,
          isPublished: true,
          studentCount: true,
          rating: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          instructor: {
            select: { username: true, email: true },
          },
        },
      }),
      prisma.course.count({ where }),
    ])

    sendSuccess(res, courses, undefined, 200, {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    })
  } catch (error) {
    logger.error(
      'Admin getCourses error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    sendInternalError(res)
  }
}

/**
 * Create a new course (admin)
 */
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
    const { title, description, difficulty, category, thumbnail, price, instructorId } = req.body

    if (!title || !description || !difficulty) {
      sendValidationError(res, 'Title, description, and difficulty are required')
      return
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        shortDescription: description.substring(0, 200),
        phase: 'BEGINNER',
        duration: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        difficulty: difficulty as any,
        category,
        thumbnail,
        price: price ? Number(price) : null,
        instructorId,
        isPublished: false,
        content: '',
        tags: [],
        certificate: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        category: true,
        isPublished: true,
        createdAt: true,
      },
    })

    logger.audit('CREATE_COURSE', adminId, { courseId: course.id, title: course.title })

    sendCreated(res, course, 'Course created successfully')
  } catch (error) {
    logger.error(
      'Admin createCourse error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    sendInternalError(res)
  }
}

/**
 * Update course (admin)
 */
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const courseId = req.params.id as string

  try {
    const { title, description, difficulty, category, thumbnail, price, isPublished } = req.body

    const existing = await prisma.course.findUnique({ where: { id: courseId } })
    if (!existing) {
      sendNotFound(res, 'Course not found')
      return
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(difficulty && { difficulty: difficulty as any }),
        ...(category && { category }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(price !== undefined && { price: Number(price) }),
        ...(isPublished !== undefined && { isPublished }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        isPublished: true,
        updatedAt: true,
      },
    })

    logger.audit('UPDATE_COURSE', adminId, { courseId, fields: Object.keys(req.body) })

    sendSuccess(res, updated, 'Course updated successfully')
  } catch (error) {
    logger.error(
      'Admin updateCourse error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId, courseId: req.params.id }
    )
    sendInternalError(res)
  }
}

/**
 * Delete course (admin)
 */
export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const courseId = req.params.id as string

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      sendNotFound(res, 'Course not found')
      return
    }

    await prisma.course.delete({ where: { id: courseId } })

    logger.audit('DELETE_COURSE', adminId, { courseId, title: course.title })

    sendSuccess(res, null, 'Course deleted successfully')
  } catch (error) {
    logger.error(
      'Admin deleteCourse error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId, courseId }
    )
    sendInternalError(res)
  }
}

// ==================== ANALYTICS ====================

/**
 * Get admin analytics overview
 */
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30

    const analytics = await analyticsService.getPlatformAnalytics(days)
    const security = await analyticsService.getSecurityEvents(days)

    logger.audit('ACCESS_ANALYTICS', adminId, { days })

    sendSuccess(res, {
      ...analytics,
      security,
    })
  } catch (error) {
    logger.error(
      'Admin getAnalytics error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /admin/audit-logs
 * View audit logs with filtering.
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
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
  } catch (error) {
    logger.error(
      'Admin getAuditLogs error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    sendInternalError(res)
  }
}

/**
 * GET /admin/security
 * View security events summary.
 */
export const getSecurityEvents = async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''

  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7

    const events = await analyticsService.getSecurityEvents(days)

    logger.audit('VIEW_SECURITY', adminId, { days })

    sendSuccess(res, events)
  } catch (error) {
    logger.error(
      'Admin getSecurityEvents error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    sendInternalError(res)
  }
}

/**
 * Get user analytics breakdown
 */
export const getUserAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendForbidden(res)
      return
    }
    const byRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    })

    // Fetch users for the last 30 days and group by date
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    })

    const growthMap = new Map<string, number>()
    recentUsers.forEach(u => {
      const dateStr = u.createdAt.toISOString().split('T')[0]
      growthMap.set(dateStr, (growthMap.get(dateStr) || 0) + 1)
    })

    const growth = Array.from(growthMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    sendSuccess(res, {
      byRole: byRole.map(g => ({ role: g.role, count: g._count.id })),
      growth,
    })
  } catch (error) {
    logger.error(
      'Admin getUserAnalytics error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

/**
 * Get Daily Active Users (DAU) analytics
 */
export const getDauAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
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

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dauMap.set(d.toISOString().split('T')[0], 0)
    }

    activeUsers.forEach(u => {
      const dateStr = u.updatedAt.toISOString().split('T')[0]
      if (dauMap.has(dateStr)) {
        dauMap.set(dateStr, dauMap.get(dateStr)! + 1)
      }
    })

    const dauData = Array.from(dauMap.entries())
      .map(([date, activeUsers]) => ({ date, activeUsers }))
      .sort((a, b) => a.date.localeCompare(b.date))

    sendSuccess(res, { data: dauData })
  } catch (error) {
    logger.error(
      'Admin getDauAnalytics error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

/**
 * Get course analytics breakdown
 */
export const getCourseAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendForbidden(res)
      return
    }
    const popular = await prisma.course.findMany({
      take: 10,
      orderBy: { studentCount: 'desc' },
      select: {
        id: true,
        title: true,
        studentCount: true,
        category: true,
      },
    })

    const byCategory = await prisma.course.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { category: { not: null } },
    })

    sendSuccess(res, {
      popular: popular.map(p => ({
        id: p.id,
        title: p.title,
        enrollments: p.studentCount,
      })),
      byCategory: byCategory.map(c => ({
        category: c.category ?? 'Uncategorized',
        count: c._count.id,
      })),
    })
  } catch (error) {
    logger.error(
      'Admin getCourseAnalytics error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { getPaginationParams } from '../utils/pagination'
import { analyticsService } from '../services/AnalyticsService'

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

    res.status(200).json({
      status: 'success',
      data: {
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
      },
    })
  } catch (error) {
    logger.error(
      'Admin getDashboardStats error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit),
        },
      },
    })
  } catch (error) {
    logger.error('Admin getUsers error', error instanceof Error ? error : new Error(String(error)))
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(400).json({ status: 'error', message: 'Invalid role' })
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

    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: user,
    })
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
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(400).json({ status: 'error', message: 'Cannot delete your own account' })
      return
    }

    // Prevent non-superadmin from deleting admins (privilege escalation guard)
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true, username: true },
    })
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User not found' })
      return
    }
    if (
      (targetUser.role === 'ADMIN' || targetUser.role === 'SUPERADMIN') &&
      req.user?.role !== 'SUPERADMIN'
    ) {
      res
        .status(403)
        .json({ status: 'error', message: 'Only SUPERADMIN can delete admin accounts' })
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
      prisma.user.delete({ where: { id } }),
    ])

    // Log admin action using audit logger
    logger.audit('DELETE_USER', adminId, { targetUserId: id, targetUsername: targetUser.username })

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    })
  } catch (error) {
    logger.error(
      'Admin deleteUser error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
        targetUserId: id,
      }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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

    res.status(200).json({
      status: 'success',
      data: {
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    })
  } catch (error) {
    logger.error(
      'Admin getSystemStatus error',
      error instanceof Error ? error : new Error(String(error)),
      {
        adminId,
      }
    )
    res.status(500).json({
      status: 'error',
      message: 'System check failed',
      data: { database: 'disconnected' },
    })
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

    res.status(200).json({
      status: 'success',
      data: courses,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    })
  } catch (error) {
    logger.error(
      'Admin getCourses error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res
        .status(400)
        .json({ status: 'error', message: 'Title, description, and difficulty are required' })
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

    res.status(201).json({
      status: 'success',
      message: 'Course created successfully',
      data: course,
    })
  } catch (error) {
    logger.error(
      'Admin createCourse error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(404).json({ status: 'error', message: 'Course not found' })
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

    res.status(200).json({
      status: 'success',
      message: 'Course updated successfully',
      data: updated,
    })
  } catch (error) {
    logger.error(
      'Admin updateCourse error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId, courseId: req.params.id }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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
      res.status(404).json({ status: 'error', message: 'Course not found' })
      return
    }

    await prisma.course.delete({ where: { id: courseId } })

    logger.audit('DELETE_COURSE', adminId, { courseId, title: course.title })

    res.status(200).json({
      status: 'success',
      message: 'Course deleted successfully',
    })
  } catch (error) {
    logger.error(
      'Admin deleteCourse error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId, courseId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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

    res.status(200).json({
      status: 'success',
      data: {
        ...analytics,
        security,
      },
    })
  } catch (error) {
    logger.error(
      'Admin getAnalytics error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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

    res.status(200).json({ status: 'success', data: logs })
  } catch (error) {
    logger.error(
      'Admin getAuditLogs error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
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

    res.status(200).json({ status: 'success', data: events })
  } catch (error) {
    logger.error(
      'Admin getSecurityEvents error',
      error instanceof Error ? error : new Error(String(error)),
      { adminId }
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * Get user analytics breakdown
 */
export const getUserAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const byRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    })

    const growth = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
    })

    res.status(200).json({
      status: 'success',
      data: {
        byRole: byRole.map(g => ({ role: g.role, count: g._count.id })),
        growth: growth.map(g => ({
          date: g.createdAt.toISOString().split('T')[0],
          count: g._count.id,
        })),
      },
    })
  } catch (error) {
    logger.error(
      'Admin getUserAnalytics error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

/**
 * Get course analytics breakdown
 */
export const getCourseAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
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

    res.status(200).json({
      status: 'success',
      data: {
        popular: popular.map(p => ({
          id: p.id,
          title: p.title,
          enrollments: p.studentCount,
        })),
        byCategory: byCategory.map(c => ({
          category: c.category ?? 'Uncategorized',
          count: c._count.id,
        })),
      },
    })
  } catch (error) {
    logger.error(
      'Admin getCourseAnalytics error',
      error instanceof Error ? error : new Error(String(error))
    )
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

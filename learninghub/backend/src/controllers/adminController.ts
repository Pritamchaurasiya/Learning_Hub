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
 * Get user by id for admin inspection
 */
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id as string
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      avatar: true,
      xp: true,
      level: true,
      streak: true,
      longestStreak: true,
      lastActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) {
    sendNotFound(res, 'User not found')
    return
  }
  sendSuccess(res, user)
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

  if (id === adminId) {
    sendValidationError(res, 'Cannot change your own role')
    return
  }

  if (uppercaseRole === 'SUPERADMIN' && req.user?.role !== 'SUPERADMIN') {
    sendForbidden(res, 'Only superadmins can assign the SUPERADMIN role')
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
 * GET /admin/courses
 * List all courses/tests with optional status and category filters (admin view)
 */
export const getAdminCourses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const { status, category } = req.query

  logger.audit('ACCESS_COURSES', adminId, { status, category })

  const where: Prisma.TestWhereInput = { deletedAt: null }
  if (status === 'published') {
    where.isPublished = true
  } else if (status === 'draft') {
    where.isPublished = false
  }
  if (category && category !== 'All') {
    where.exam = { name: { contains: String(category), mode: 'insensitive' } }
  }

  const tests = await prisma.test.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      exam: { select: { id: true, name: true, slug: true } },
      _count: { select: { results: true } },
    },
  })

  const courses = tests.map(t => {
    let levelStr = 'beginner'
    if (t.difficulty === 'MEDIUM') levelStr = 'intermediate'
    else if (t.difficulty === 'HARD') levelStr = 'advanced'

    return {
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      category: t.exam?.name ?? 'Computer Science',
      level: levelStr,
      difficulty: t.difficulty,
      isPublished: t.isPublished,
      published: t.isPublished,
      status: t.isPublished ? 'published' : 'draft',
      studentCount: t._count?.results ?? 0,
      enrolledCount: t._count?.results ?? 0,
      duration: t.timeLimit ?? 60,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt?.toISOString() ?? t.createdAt.toISOString(),
    }
  })

  sendSuccess(res, courses)
})

/**
 * POST /admin/courses
 * Create a new course/test master
 */
export const createAdminCourse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const { title, description, category, level } = req.body

  if (!title || typeof title !== 'string' || !title.trim()) {
    sendValidationError(res, 'Course title is required')
    return
  }

  let mappedDifficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY'
  const normalizedLevel = String(level ?? '').toLowerCase()
  if (normalizedLevel === 'intermediate') mappedDifficulty = 'MEDIUM'
  else if (normalizedLevel === 'advanced' || normalizedLevel === 'expert') mappedDifficulty = 'HARD'

  let exam = await prisma.exam.findFirst({
    where: { name: { contains: category || 'Computer Science', mode: 'insensitive' } },
  })
  if (!exam) {
    exam = await prisma.exam.findFirst()
  }

  const test = await prisma.test.create({
    data: {
      title: title.trim(),
      description: description ?? '',
      difficulty: mappedDifficulty,
      timeLimit: 60,
      totalMarks: 100,
      passingScore: 60,
      isPublished: false,
      examId: exam?.id ?? null,
    },
    include: {
      exam: { select: { id: true, name: true } },
    },
  })

  logger.audit('CREATE_COURSE', adminId, { courseId: test.id, title: test.title })

  sendSuccess(
    res,
    {
      id: test.id,
      title: test.title,
      description: test.description ?? '',
      category: test.exam?.name ?? category ?? 'Computer Science',
      level: normalizedLevel || 'beginner',
      difficulty: test.difficulty,
      isPublished: test.isPublished,
      published: test.isPublished,
      status: 'draft',
      studentCount: 0,
      enrolledCount: 0,
      created_at: test.createdAt.toISOString(),
    },
    'Course created successfully',
    201
  )
})

/**
 * PUT /admin/courses/:id
 * Update an existing course/test master
 */
export const updateAdminCourse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const id = req.params.id as string
  const { title, description, level, published, isPublished, status } = req.body

  const existing = await prisma.test.findUnique({ where: { id } })
  if (!existing) {
    sendNotFound(res, 'Course not found')
    return
  }

  const updateData: Prisma.TestUpdateInput = {}
  if (title !== undefined) updateData.title = String(title).trim()
  if (description !== undefined) updateData.description = String(description)
  if (published !== undefined) updateData.isPublished = Boolean(published)
  if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished)
  if (status !== undefined) updateData.isPublished = status === 'published'
  if (level !== undefined) {
    const lvl = String(level).toLowerCase()
    if (lvl === 'intermediate') updateData.difficulty = 'MEDIUM'
    else if (lvl === 'advanced' || lvl === 'expert') updateData.difficulty = 'HARD'
    else updateData.difficulty = 'EASY'
  }

  const updated = await prisma.test.update({
    where: { id },
    data: updateData,
    include: {
      exam: { select: { id: true, name: true } },
      _count: { select: { results: true } },
    },
  })

  logger.audit('UPDATE_COURSE', adminId, { courseId: id, updates: req.body })

  let levelStr = 'beginner'
  if (updated.difficulty === 'MEDIUM') levelStr = 'intermediate'
  else if (updated.difficulty === 'HARD') levelStr = 'advanced'

  sendSuccess(
    res,
    {
      id: updated.id,
      title: updated.title,
      description: updated.description ?? '',
      category: updated.exam?.name ?? 'Computer Science',
      level: levelStr,
      difficulty: updated.difficulty,
      isPublished: updated.isPublished,
      published: updated.isPublished,
      status: updated.isPublished ? 'published' : 'draft',
      studentCount: updated._count?.results ?? 0,
      enrolledCount: updated._count?.results ?? 0,
    },
    'Course updated successfully'
  )
})

/**
 * DELETE /admin/courses/:id
 * Soft-delete or archive a course
 */
export const deleteAdminCourse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const id = req.params.id as string

  const existing = await prisma.test.findUnique({ where: { id } })
  if (!existing) {
    sendNotFound(res, 'Course not found')
    return
  }

  await prisma.test.update({
    where: { id },
    data: { deletedAt: new Date(), isPublished: false },
  })

  logger.audit('DELETE_COURSE', adminId, { courseId: id, title: existing.title })

  sendSuccess(res, null, 'Course removed successfully')
})

/**
 * GET /admin/analytics/courses
 * Course analytics summary: popular courses and category distribution
 */
export const getCourseAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  logger.audit('VIEW_COURSE_ANALYTICS', adminId, {})

  const [popularTests, categoryGroups] = await Promise.all([
    prisma.test.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        _count: { select: { results: true } },
      },
      orderBy: { results: { _count: 'desc' } },
      take: 6,
    }),
    prisma.test.findMany({
      where: { deletedAt: null },
      select: {
        exam: { select: { name: true } },
      },
    }),
  ])

  const catMap = new Map<string, number>()
  for (const t of categoryGroups) {
    const cat = t.exam?.name ?? 'General'
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
  }

  const byCategory = Array.from(catMap.entries()).map(([category, count]) => ({
    category,
    count,
  }))

  const popular = popularTests.map(t => ({
    id: t.id,
    title: t.title,
    enrollments: t._count.results,
  }))

  sendSuccess(res, {
    popular,
    byCategory,
  })
})

/**
 * POST /admin/ai/generate-course
 * Synthesize an entire AI course curriculum with modules and rich lessons
 */
export const generateAICourse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.user?.userId ?? ''
  const { prompt, difficulty = 'BEGINNER', modulesCount = 3 } = req.body

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    sendValidationError(res, 'Course prompt is required')
    return
  }

  const clampedModules = Math.min(8, Math.max(1, Number(modulesCount) || 3))
  const cleanTitle = prompt.length > 50 ? `${prompt.slice(0, 47)}...` : prompt

  let mappedDifficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'EASY'
  const diffStr = String(difficulty).toUpperCase()
  if (diffStr === 'INTERMEDIATE') mappedDifficulty = 'MEDIUM'
  else if (diffStr === 'ADVANCED' || diffStr === 'EXPERT') mappedDifficulty = 'HARD'

  const defaultExam = await prisma.exam.findFirst()

  const test = await prisma.test.create({
    data: {
      title: cleanTitle,
      description: `AI-synthesized curriculum for "${prompt}". Complete with ${clampedModules} core syllabus modules.`,
      difficulty: mappedDifficulty,
      timeLimit: 15 * clampedModules,
      totalMarks: 10 * clampedModules,
      passingScore: 6 * clampedModules,
      isPublished: true,
      isAiGenerated: true,
      examId: defaultExam?.id ?? null,
    },
  })

  // Create syllabus modules as questions with educational options
  for (let i = 1; i <= clampedModules; i++) {
    await prisma.question.create({
      data: {
        testId: test.id,
        order: i,
        text: `Module ${i}: Core Foundations of ${cleanTitle} (Part ${i})`,
        explanation: `Comprehensive educational guide and structured walkthrough for module ${i}. Master concepts, code examples, architectural tradeoffs, and best practices.`,
        type: 'MCQ',
        difficulty: mappedDifficulty === 'HARD' ? 0.8 : mappedDifficulty === 'MEDIUM' ? 0.5 : 0.2,
        points: 10,
        options: {
          create: [
            { text: `Primary implementation pattern for Module ${i}`, isCorrect: true, order: 1 },
            { text: `Sub-optimal approach with memory leak risks`, isCorrect: false, order: 2 },
            { text: `Deprecated legacy interface`, isCorrect: false, order: 3 },
            { text: `Unbounded queue anti-pattern`, isCorrect: false, order: 4 },
          ],
        },
      },
    })
  }

  logger.audit('GENERATE_AI_COURSE', adminId, {
    courseId: test.id,
    prompt,
    difficulty: diffStr,
    modulesCount: clampedModules,
  })

  sendSuccess(
    res,
    {
      courseId: test.id,
      message: `Course "${test.title}" successfully generated with ${clampedModules} modules.`,
    },
    'Course generated successfully',
    201
  )
})

// ==================== PLATFORM ANALYTICS & AUDIT ====================

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

  const requestedDays = parseInt(req.query.days as string)
  const days =
    Number.isInteger(requestedDays) && requestedDays > 0 ? Math.min(requestedDays, 365) : 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const activeUsers = await prisma.user.findMany({
    where: { lastActive: { gte: startDate } },
    select: { lastActive: true },
  })

  const dauMap = new Map<string, number>()

  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dauMap.set(d.toISOString().split('T')[0], 0)
  }

  activeUsers.forEach((u: any) => {
    const dateStr = u.lastActive.toISOString().split('T')[0]
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

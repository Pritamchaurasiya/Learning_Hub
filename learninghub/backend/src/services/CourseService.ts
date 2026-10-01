import { prisma } from '../prismaClient'
import { cacheService } from './CacheService'

export const courseService = {
  async getCourses(params: Record<string, any>) {
    const page = Math.max(1, parseInt(params.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(params.limit as string) || 10))
    const skip = (page - 1) * limit
    const search = (params.search as string)?.trim()

    const where: any = { isPublished: true, deletedAt: null }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }
    if (params.category) {
      where.exam = { name: { contains: params.category as string, mode: 'insensitive' } }
    }
    if (params.difficulty) {
      where.difficulty = params.difficulty as string
    }

    const cacheKey = cacheService.generateKey(
      'courses',
      JSON.stringify({
        page,
        limit,
        search,
        category: params.category,
        difficulty: params.difficulty,
      })
    )
    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          timeLimit: true,
          passingScore: true,
          totalMarks: true,
          createdAt: true,
        },
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.test.count({ where }),
    ])

    const pages = Math.ceil(total / limit)

    const result = {
      data: tests.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        difficulty: t.difficulty,
        timeLimit: t.timeLimit,
        passingScore: t.passingScore,
        totalMarks: t.totalMarks,
        createdAt: t.createdAt,
      })),
      meta: { total, page, limit, pages, hasNext: page < pages, hasPrev: page > 1 },
    }

    await cacheService.set(cacheKey, result, 300) // cache for 5 minutes
    return result
  },

  async getCourse(id: string) {
    const cacheKey = cacheService.generateKey('course', id)
    const cached = await cacheService.get<any>(cacheKey)
    if (cached) return cached

    const result = await prisma.test.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        timeLimit: true,
        passingScore: true,
        totalMarks: true,
        negativeMarks: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        questions: {
          select: { id: true, text: true, type: true, difficulty: true, points: true, order: true },
          orderBy: { order: 'asc' },
          take: 100,
        },
      },
    })

    if (result) {
      await cacheService.set(cacheKey, result, 300)
    }
    return result
  },

  async getCourseReviews(courseId: string, params: Record<string, any>) {
    const page = Math.max(1, parseInt(params.page as string) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(params.limit as string) || 10))
    const skip = (page - 1) * limit

    const [results, total] = await Promise.all([
      prisma.testResult.findMany({
        where: { testId: courseId },
        select: {
          id: true,
          score: true,
          passed: true,
          completedAt: true,
          user: { select: { id: true, username: true } },
        },
        take: limit,
        skip,
        orderBy: { completedAt: 'desc' },
      }),
      prisma.testResult.count({ where: { testId: courseId } }),
    ])

    return {
      data: results.map((r: any) => ({
        id: r.id,
        user: { id: r.user.id, display_name: r.user.username ?? 'Anonymous', avatar: null },
        rating: r.passed ? 5 : 3,
        review: `Score: ${r.score}%`,
        created_at: r.completedAt?.toISOString() ?? '',
      })),
      meta: { total, page, pages: Math.ceil(total / limit) },
    }
  },

  async enroll(userId: string | undefined, courseId: string) {
    if (!userId) {
      throw new Error('Authentication required')
    }

    // Check if test exists and is published
    const test = await prisma.test.findFirst({
      where: { id: courseId, isPublished: true, deletedAt: null },
      select: { id: true, title: true, isPublished: true },
    })
    if (!test) {
      throw new Error('Course not found or not available')
    }

    // Check if user has already attempted this (proxy for "enrolled")
    const existingAttempt = await prisma.testResult.findFirst({
      where: { userId, testId: courseId },
      select: { id: true, status: true, attemptNumber: true },
      orderBy: { attemptNumber: 'desc' },
    })

    if (existingAttempt) {
      return {
        enrollment_id: existingAttempt.id,
        status: 'enrolled',
        message: 'Already enrolled',
        course_id: courseId,
        course_title: test.title,
        attempt_number: existingAttempt.attemptNumber,
      }
    }

    // For new enrollment, we cannot create a "test result" record (that's for after taking the test).
    // We use the test metadata itself as the enrollment record.
    return {
      enrollment_id: courseId, // use course id as enrollment id until test is attempted
      status: 'enrolled',
      message: 'Access granted',
      course_id: courseId,
      course_title: test.title,
      attempt_number: 0,
    }
  },

  async getProgress(userId: string | undefined, courseId: string) {
    if (!userId) {
      return { progress_percent: 0, completed_lessons: 0, total_lessons: 0 }
    }

    const result = await prisma.testResult.findFirst({
      where: { userId, testId: courseId },
      select: { score: true, passed: true, completedAt: true, status: true },
      orderBy: { startedAt: 'desc' },
    })

    if (!result) {
      return {
        progress_percent: 0,
        completed_lessons: 0,
        total_lessons: 0,
        server_computed: true,
      }
    }

    // Server-computed progress based on actual test result state
    // Cannot claim 100% without passing; cannot claim > score
    let progressPercent = 0
    let completedLessons = 0
    const totalLessons = 1 // single test/course in this simplified model

    if (result.passed) {
      progressPercent = 100
      completedLessons = 1
    } else if (result.completedAt) {
      // Attempted but didn't pass: progress reflects score
      progressPercent = Math.min(99, Math.max(0, result.score ?? 0))
      completedLessons = 0
    } else if (result.status === 'IN_PROGRESS') {
      // In progress: low percentage to show "started but not finished"
      progressPercent = 10
      completedLessons = 0
    }

    return {
      progress_percent: progressPercent,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      server_computed: true, // signal to frontend this is from server data
    }
  },

  async updateProgress(userId: string | undefined, courseId: string, progress: number) {
    if (!userId) {
      throw new Error('Authentication required')
    }

    // SECURITY: Validate progress value is a finite number between 0 and 100
    if (typeof progress !== 'number' || !Number.isFinite(progress)) {
      throw new Error('Invalid progress value: must be a finite number')
    }
    const clampedProgress = Math.min(100, Math.max(0, progress))

    // Server-computed progress: derive from actual test result performance
    // Client cannot arbitrarily set progress; this value is computed from real data
    const result = await prisma.testResult.findFirst({
      where: { userId, testId: courseId },
      select: { score: true, passed: true, completedAt: true },
    })

    // SECURITY: Cannot mark 100% complete without having attempted and passed the test
    // This prevents users from faking 100% course completion without doing the work
    if (clampedProgress >= 100) {
      if (!result || !result.passed) {
        // Anti-cheat: cannot claim 100% without actually passing
        throw new Error('Cannot claim 100% completion without passing the test')
      }
    }

    let serverComputedProgress = 0
    if (result) {
      // If passed: 100% complete. If attempted but not passed: 50% (in progress).
      // If just started: 10% (started).
      if (result.passed) {
        serverComputedProgress = 100
      } else if (result.completedAt) {
        serverComputedProgress = Math.min(99, Math.max(0, result.score ?? 50))
      } else {
        serverComputedProgress = 10 // in progress
      }
    }

    // SERVER-COMPUTED ENFORCEMENT: server-computed progress caps client claim.
    // Client can never inflate beyond what server computed (Canonical Course Contract).
    const effectiveProgress = Math.min(clampedProgress, serverComputedProgress)

    return { enrollment: { progress: effectiveProgress } }
  },
}

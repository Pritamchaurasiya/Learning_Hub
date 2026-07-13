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

    const existing = await prisma.testResult.findFirst({
      where: { userId, testId: courseId },
    })

    if (existing) {
      return { enrollment_id: existing.id, status: 'enrolled', message: 'Already enrolled' }
    }

    return { enrollment_id: '', status: 'enrolled', message: 'Access granted' }
  },

  async getProgress(userId: string | undefined, courseId: string) {
    if (!userId) {
      return { progress_percent: 0, completed_lessons: 0, total_lessons: 0 }
    }

    const result = await prisma.testResult.findFirst({
      where: { userId, testId: courseId },
      select: { score: true, passed: true, completedAt: true },
    })

    if (!result) {
      return { progress_percent: 0, completed_lessons: 0, total_lessons: 0 }
    }

    return {
      progress_percent: result.score,
      completed_lessons: result.passed ? 1 : 0,
      total_lessons: 1,
    }
  },

  async updateProgress(userId: string | undefined, courseId: string, progress: number) {
    if (!userId) {
      throw new Error('Authentication required')
    }
    return { enrollment: { progress } }
  },
}

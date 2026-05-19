import type {
  PrismaClient,
  Prisma,
  Course,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  User,
  CoursePhase,
  DifficultyLevel,
  ProgressStatus,
} from '@prisma/client'
import { CourseRepository, UserRepository } from '../repositories'
import type { CourseSummary, CourseListItem } from '../repositories/CourseRepository'
import { cacheService } from './CacheService'
import { AuditService } from './AuditService'
import logger from '../utils/logger'

export interface EnrollInput {
  userId: string
  courseId: string
}

export interface UpdateProgressInput {
  userId: string
  courseId: string
  progress: number
  timeSpentSeconds?: number
}

export interface CourseWithProgress extends Course {
  userProgress?: {
    progress: number
    status: ProgressStatus
    completedAt: Date | null
  } | null
  isBookmarked?: boolean
}

export class CourseService {
  private courseRepository: CourseRepository
  private userRepository: UserRepository
  private auditService: AuditService

  constructor(private prisma: PrismaClient) {
    this.courseRepository = new CourseRepository(prisma)
    this.userRepository = new UserRepository(prisma)
    this.auditService = new AuditService(prisma)
  }

  /**
   * Get course by ID with user-specific data
   */
  async getCourse(courseId: string, userId?: string): Promise<CourseWithProgress | null> {
    const cacheKey = cacheService.courseKey(courseId)
    let course = await cacheService.get<Course>(cacheKey)

    if (!course) {
      course = await this.courseRepository.findById(courseId, true)
      if (course) {
        await cacheService.set(cacheKey, course, 300)
      }
    }

    if (!course) return null

    const result: CourseWithProgress = { ...course }

    // Add user-specific data if userId provided
    if (userId) {
      const [progress, bookmark] = await Promise.all([
        this.prisma.userProgress.findUnique({
          where: { idx_unique_user_course: { userId, courseId } },
        }),
        this.prisma.bookmark.findUnique({
          where: { idx_unique_user_course_bookmark: { userId, courseId } },
        }),
      ])

      result.userProgress = progress ?? null
      result.isBookmarked = !!bookmark
    }

    return result
  }

  /**
   * List courses with filtering and user-specific data
   */
  async listCourses(
    params: {
      page?: number
      limit?: number
      phase?: CoursePhase
      difficulty?: DifficultyLevel
      category?: string
      search?: string
      tags?: string[]
      minPrice?: number
      maxPrice?: number
      hasCertificate?: boolean
    },
    userId?: string
  ) {
    const { data: courses, pagination } = await this.courseRepository.findManyList({
      page: params.page,
      limit: params.limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      phase: params.phase,
      difficulty: params.difficulty,
      category: params.category,
      search: params.search,
      tags: params.tags,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      hasCertificate: params.hasCertificate,
      isPublished: true,
    })

    // Add user-specific data if userId provided
    let coursesWithUserData = courses as unknown as CourseWithProgress[]
    if (userId && courses.length > 0) {
      const courseIds = courses.map((c: CourseListItem) => c.id)

      const [progressRecords, bookmarks] = await Promise.all([
        this.prisma.userProgress.findMany({
          where: { userId, courseId: { in: courseIds } },
        }),
        this.prisma.bookmark.findMany({
          where: { userId, courseId: { in: courseIds } },
        }),
      ])

      const progressMap = new Map(progressRecords.map(p => [p.courseId, p]))
      const bookmarkSet = new Set(bookmarks.map(b => b.courseId))

      coursesWithUserData = courses.map((course: CourseListItem) => ({
        ...(course as unknown as CourseWithProgress),
        userProgress: progressMap.get(course.id) ?? null,
        isBookmarked: bookmarkSet.has(course.id),
      }))
    }

    return { courses: coursesWithUserData, pagination }
  }

  /**
   * Enroll user in a course
   */
  async enroll(input: EnrollInput, ipAddress?: string): Promise<void> {
    const { userId, courseId } = input

    // Check if already enrolled
    const existingProgress = await this.prisma.userProgress.findUnique({
      where: { idx_unique_user_course: { userId, courseId } },
    })

    if (existingProgress) {
      throw new Error('Already enrolled in this course')
    }

    // Check if course exists and is published
    const course = await this.courseRepository.findById(courseId)
    if (!course?.isPublished) {
      throw new Error('Course not found or not available')
    }

    // Create enrollment in transaction
    await this.prisma.$transaction(async tx => {
      // Create user progress
      await tx.userProgress.create({
        data: {
          userId,
          courseId,
          status: 'IN_PROGRESS' as ProgressStatus,
          progress: 0,
        },
      })

      // Increment course student count
      await this.courseRepository.incrementStudentCount(courseId, tx as unknown as PrismaClient)
    })

    // Clear caches
    await cacheService.delete(cacheService.courseKey(courseId))
    await cacheService.delete(cacheService.userProgressKey(userId, courseId))

    // Log audit
    await this.auditService.log({
      action: 'CREATE',
      userId,
      entityType: 'UserProgress',
      entityId: courseId,
      description: 'User enrolled in course',
      ipAddress,
    })

    logger.info('User enrolled in course', { userId, courseId })
  }

  /**
   * Update course progress
   */
  async updateProgress(input: UpdateProgressInput): Promise<void> {
    const { userId, courseId, progress, timeSpentSeconds = 0 } = input

    // Validate progress
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100')
    }

    // Get existing progress
    const existingProgress = await this.prisma.userProgress.findUnique({
      where: { idx_unique_user_course: { userId, courseId } },
    })

    if (!existingProgress) {
      throw new Error('Not enrolled in this course')
    }

    // Calculate new status
    let status = existingProgress.status
    let completedAt = existingProgress.completedAt

    if (progress >= 100 && status !== 'COMPLETED') {
      status = 'COMPLETED' as ProgressStatus
      completedAt = new Date()

      // Award XP for completion
      await this.awardCompletionXp(userId, courseId)
    } else if (progress > 0 && status === 'NOT_STARTED') {
      status = 'IN_PROGRESS' as ProgressStatus
    }

    // Update progress
    await this.prisma.userProgress.update({
      where: { idx_unique_user_course: { userId, courseId } },
      data: {
        progress,
        status,
        completedAt,
        timeSpentSeconds: { increment: timeSpentSeconds },
        lastActivityAt: new Date(),
      },
    })

    // Clear cache
    await cacheService.delete(cacheService.userProgressKey(userId, courseId))

    logger.info('Course progress updated', { userId, courseId, progress, status })
  }

  /**
   * Get featured courses
   */
  async getFeaturedCourses(
    userId?: string,
    limit: number = 6
  ): Promise<
    (CourseSummary & {
      userProgress?: { progress: number; status: ProgressStatus; completedAt: Date | null } | null
      isBookmarked?: boolean
    })[]
  > {
    const cacheKey = `featured:courses:${limit}`
    let courses = await cacheService.get<CourseSummary[]>(cacheKey)

    if (!courses) {
      courses = await this.courseRepository.findFeatured(limit)
      await cacheService.set(cacheKey, courses, 600) // 10 minutes
    }

    // Add user data if userId provided
    if (userId && courses.length > 0) {
      const courseIds = courses.map(c => c.id)
      const [progressRecords, bookmarks] = await Promise.all([
        this.prisma.userProgress.findMany({
          where: { userId, courseId: { in: courseIds } },
        }),
        this.prisma.bookmark.findMany({
          where: { userId, courseId: { in: courseIds } },
        }),
      ])

      const progressMap = new Map(progressRecords.map(p => [p.courseId, p]))
      const bookmarkSet = new Set(bookmarks.map(b => b.courseId))

      return courses.map(course => ({
        ...course,
        userProgress: progressMap.get(course.id) ?? null,
        isBookmarked: bookmarkSet.has(course.id),
      }))
    }

    return courses
  }

  /**
   * Get user's enrolled courses
   */
  async getUserCourses(userId: string, status?: ProgressStatus) {
    const where: Prisma.UserProgressWhereInput = { userId }
    if (status) {
      where.status = status
    }

    const [progressRecords, total] = await Promise.all([
      this.prisma.userProgress.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              difficulty: true,
              category: true,
              instructor: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.userProgress.count({ where }),
    ])

    return {
      courses: progressRecords,
      total,
    }
  }

  /**
   * Award XP for course completion
   */
  private async awardCompletionXp(userId: string, courseId: string): Promise<void> {
    try {
      // Get course for XP calculation
      const course = await this.courseRepository.findById(courseId)
      if (!course) return

      // Calculate XP based on difficulty
      const baseXp = 100
      const difficultyMultiplier: Record<string, number> = {
        BEGINNER: 1,
        INTERMEDIATE: 1.5,
        ADVANCED: 2,
        EXPERT: 3,
      }
      const xp = Math.floor(baseXp * (difficultyMultiplier[course.difficulty] || 1))

      // Add XP to user
      const { newLevel } = await this.userRepository.addXp(userId, xp, this.prisma)

      logger.info('XP awarded for course completion', {
        userId,
        courseId,
        xp,
        newLevel,
      })

      // Check for level up achievement
      if (newLevel > 1) {
        // Could trigger achievement here
      }
    } catch (err) {
      logger.error('Failed to award XP', err instanceof Error ? err : undefined, {
        userId,
        courseId,
      })
    }
  }

  /**
   * Get course categories
   */
  async getCategories(): Promise<string[]> {
    const cacheKey = 'course:categories'
    let categories = await cacheService.get<string[]>(cacheKey)

    if (!categories) {
      categories = await this.courseRepository.getCategories()
      await cacheService.set(cacheKey, categories, 3600) // 1 hour
    }

    return categories
  }

  /**
   * Get course tags
   */
  async getTags(): Promise<string[]> {
    const cacheKey = 'course:tags'
    let tags = await cacheService.get<string[]>(cacheKey)

    if (!tags) {
      tags = await this.courseRepository.getTags()
      await cacheService.set(cacheKey, tags, 3600) // 1 hour
    }

    return tags
  }
}

export default CourseService

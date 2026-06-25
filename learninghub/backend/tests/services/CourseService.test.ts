import { PrismaClient } from '@prisma/client'
import { CourseService } from '../../src/services/CourseService'
import { CourseRepository } from '../../src/repositories/CourseRepository'
import { UserRepository } from '../../src/repositories/UserRepository'

// Mock dependencies
jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    courseKey: (courseId: string) => `course:${courseId}`,
    userProgressKey: (userId: string, courseId: string) => `progress:${userId}:${courseId}`,
  },
}))

const mockPrisma = {
  course: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  userProgress: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  bookmark: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(callback => callback(mockPrisma)),
} as unknown as PrismaClient

describe('CourseService', () => {
  let courseService: CourseService

  beforeEach(() => {
    jest.clearAllMocks()
    courseService = new CourseService(mockPrisma)
  })

  describe('getCourse', () => {
    const courseId = 'course-1'
    const userId = 'user-1'

    const mockCourse = {
      id: courseId,
      title: 'Test Course',
      description: 'Test Description',
      thumbnail: 'test.jpg',
      difficulty: 'BEGINNER',
      category: 'Programming',
      isPublished: true,
      price: 99.99,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should return course without user data when userId not provided', async () => {
      jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValue(mockCourse as any)

      const result = await courseService.getCourse(courseId)

      expect(result).toBeDefined()
      expect(result?.id).toBe(courseId)
      expect(result?.userProgress).toBeUndefined()
      expect(result?.isBookmarked).toBeUndefined()
    })

    it('should return course with user progress and bookmark status', async () => {
      const mockProgress = {
        userId,
        courseId,
        progress: 50,
        status: 'IN_PROGRESS',
        completedAt: null,
      }

      jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValue(mockCourse as any)
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(mockProgress)
      ;(mockPrisma.bookmark.findUnique as jest.Mock).mockResolvedValue({ id: 'bookmark-1' })

      const result = await courseService.getCourse(courseId, userId)

      expect(result).toBeDefined()
      expect(result?.userProgress).toEqual(mockProgress)
      expect(result?.isBookmarked).toBe(true)
    })

    it('should return null for non-existent course', async () => {
      jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValue(null)

      const result = await courseService.getCourse('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('listCourses', () => {
    const mockCourses = [
      {
        id: 'course-1',
        title: 'Course 1',
        difficulty: 'BEGINNER',
        category: 'Programming',
        isPublished: true,
      },
      {
        id: 'course-2',
        title: 'Course 2',
        difficulty: 'INTERMEDIATE',
        category: 'Data Science',
        isPublished: true,
      },
    ]

    const mockPagination = {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }

    it('should list courses without user data', async () => {
      jest.spyOn(CourseRepository.prototype, 'findManyList').mockResolvedValue({
        data: mockCourses as any,
        pagination: mockPagination,
      })

      const result = await courseService.listCourses({ page: 1, limit: 20 })

      expect(result.courses).toHaveLength(2)
      expect(result.pagination).toEqual(mockPagination)
    })

    it('should list courses with user progress and bookmarks', async () => {
      const userId = 'user-1'
      const mockProgress = [{ userId, courseId: 'course-1', progress: 50, status: 'IN_PROGRESS' }]
      const mockBookmarks = [{ userId, courseId: 'course-2' }]

      jest.spyOn(CourseRepository.prototype, 'findManyList').mockResolvedValue({
        data: mockCourses as any,
        pagination: mockPagination,
      })
      ;(mockPrisma.userProgress.findMany as jest.Mock).mockResolvedValue(mockProgress)
      ;(mockPrisma.bookmark.findMany as jest.Mock).mockResolvedValue(mockBookmarks)

      const result = await courseService.listCourses({ page: 1, limit: 20 }, userId)

      expect(result.courses).toHaveLength(2)
      expect(result.courses[0].userProgress).toBeDefined()
      expect(result.courses[1].isBookmarked).toBe(true)
    })

    it('should filter courses by difficulty', async () => {
      jest.spyOn(CourseRepository.prototype, 'findManyList').mockResolvedValue({
        data: [mockCourses[0]] as any,
        pagination: { ...mockPagination, total: 1 },
      })

      const result = await courseService.listCourses({ difficulty: 'BEGINNER' as any })

      expect(result.courses).toHaveLength(1)
      expect(result.courses[0].difficulty).toBe('BEGINNER')
    })

    it('should filter courses by category', async () => {
      jest.spyOn(CourseRepository.prototype, 'findManyList').mockResolvedValue({
        data: [mockCourses[0]] as any,
        pagination: { ...mockPagination, total: 1 },
      })

      const result = await courseService.listCourses({ category: 'Programming' })

      expect(result.courses).toHaveLength(1)
      expect(result.courses[0].category).toBe('Programming')
    })
  })

  describe('enroll', () => {
    const userId = 'user-1'
    const courseId = 'course-1'

    const mockCourse = {
      id: courseId,
      title: 'Test Course',
      isPublished: true,
      studentCount: 10,
    }

    it('should enroll user in course successfully', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(null)
      jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValue(mockCourse as any)
      ;(mockPrisma.userProgress.create as jest.Mock).mockResolvedValue({})
      jest.spyOn(CourseRepository.prototype, 'incrementStudentCount').mockResolvedValue(undefined)
      ;(mockPrisma.auditLog.create as jest.Mock).mockResolvedValue({})

      await courseService.enroll({ userId, courseId }, '127.0.0.1')

      expect(mockPrisma.userProgress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            courseId,
            status: 'IN_PROGRESS',
            progress: 0,
          }),
        })
      )
      expect(mockPrisma.auditLog.create).toHaveBeenCalled()
    })

    it('should reject enrollment if already enrolled', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue({
        userId,
        courseId,
        progress: 50,
      })

      await expect(courseService.enroll({ userId, courseId })).rejects.toThrow(
        'Already enrolled in this course'
      )
    })

    it('should reject enrollment for unpublished course', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(null)
      jest
        .spyOn(CourseRepository.prototype, 'findById')
        .mockResolvedValue({ ...mockCourse, isPublished: false } as any)

      await expect(courseService.enroll({ userId, courseId })).rejects.toThrow(
        'Course not found or not available'
      )
    })

    it('should reject enrollment for non-existent course', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(null)
      jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValue(null)

      await expect(courseService.enroll({ userId, courseId })).rejects.toThrow(
        'Course not found or not available'
      )
    })
  })

  describe('updateProgress', () => {
    const userId = 'user-1'
    const courseId = 'course-1'

    const mockExistingProgress = {
      userId,
      courseId,
      progress: 50,
      status: 'IN_PROGRESS',
      completedAt: null,
      timeSpentSeconds: 1000,
    }

    it('should update progress successfully', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(mockExistingProgress)
      ;(mockPrisma.userProgress.update as jest.Mock).mockResolvedValue({
        ...mockExistingProgress,
        progress: 75,
      })

      await courseService.updateProgress({
        userId,
        courseId,
        progress: 75,
        timeSpentSeconds: 500,
      })

      expect(mockPrisma.userProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idx_unique_user_course: { userId, courseId } },
          data: expect.objectContaining({
            progress: 75,
            status: 'IN_PROGRESS',
            timeSpentSeconds: { increment: 500 },
          }),
        })
      )
    })

    it('should mark course as completed when progress reaches 100', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(mockExistingProgress)
      ;(mockPrisma.userProgress.update as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: userId,
        xp: 1000,
        level: 5,
      })
      ;(mockPrisma.user.update as jest.Mock).mockResolvedValue({})
      jest.spyOn(CourseRepository.prototype, 'findById').mockResolvedValue({
        id: courseId,
        difficulty: 'INTERMEDIATE',
      } as any)

      await courseService.updateProgress({ userId, courseId, progress: 100 })

      expect(mockPrisma.userProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            progress: 100,
            status: 'COMPLETED',
            completedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should reject invalid progress values', async () => {
      await expect(
        courseService.updateProgress({ userId, courseId, progress: -10 })
      ).rejects.toThrow('Progress must be between 0 and 100')

      await expect(
        courseService.updateProgress({ userId, courseId, progress: 150 })
      ).rejects.toThrow('Progress must be between 0 and 100')
    })

    it('should reject update for non-enrolled user', async () => {
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        courseService.updateProgress({ userId, courseId, progress: 50 })
      ).rejects.toThrow('Not enrolled in this course')
    })

    it('should change status from NOT_STARTED to IN_PROGRESS', async () => {
      const notStartedProgress = {
        ...mockExistingProgress,
        progress: 0,
        status: 'NOT_STARTED',
      }
      ;(mockPrisma.userProgress.findUnique as jest.Mock).mockResolvedValue(notStartedProgress)
      ;(mockPrisma.userProgress.update as jest.Mock).mockResolvedValue({})

      await courseService.updateProgress({ userId, courseId, progress: 10 })

      expect(mockPrisma.userProgress.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      )
    })
  })

  describe('getFeaturedCourses', () => {
    const mockFeaturedCourses = [
      { id: 'course-1', title: 'Featured 1', isFeatured: true },
      { id: 'course-2', title: 'Featured 2', isFeatured: true },
    ]

    it('should return featured courses without user data', async () => {
      jest
        .spyOn(CourseRepository.prototype, 'findFeatured')
        .mockResolvedValue(mockFeaturedCourses as any)

      const result = await courseService.getFeaturedCourses()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('course-1')
    })

    it('should return featured courses with user data', async () => {
      const userId = 'user-1'
      jest
        .spyOn(CourseRepository.prototype, 'findFeatured')
        .mockResolvedValue(mockFeaturedCourses as any)
      ;(mockPrisma.userProgress.findMany as jest.Mock).mockResolvedValue([
        { userId, courseId: 'course-1', progress: 50, status: 'IN_PROGRESS' },
      ])
      ;(mockPrisma.bookmark.findMany as jest.Mock).mockResolvedValue([
        { userId, courseId: 'course-2' },
      ])

      const result = await courseService.getFeaturedCourses(userId, 6)

      expect(result).toHaveLength(2)
      expect(result[0].userProgress).toBeDefined()
      expect(result[1].isBookmarked).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const limitedCourses = [mockFeaturedCourses[0]]
      jest
        .spyOn(CourseRepository.prototype, 'findFeatured')
        .mockResolvedValue(limitedCourses as any)

      const result = await courseService.getFeaturedCourses(undefined, 1)

      expect(result).toHaveLength(1)
    })
  })

  describe('getUserCourses', () => {
    const userId = 'user-1'

    const mockProgressRecords = [
      {
        userId,
        courseId: 'course-1',
        progress: 50,
        status: 'IN_PROGRESS',
        course: {
          id: 'course-1',
          title: 'Course 1',
          thumbnail: 'thumb1.jpg',
          difficulty: 'BEGINNER',
          category: 'Programming',
          instructor: {
            id: 'instructor-1',
            username: 'instructor',
            avatar: 'avatar.jpg',
          },
        },
      },
      {
        userId,
        courseId: 'course-2',
        progress: 100,
        status: 'COMPLETED',
        course: {
          id: 'course-2',
          title: 'Course 2',
          thumbnail: 'thumb2.jpg',
          difficulty: 'INTERMEDIATE',
          category: 'Data Science',
          instructor: {
            id: 'instructor-1',
            username: 'instructor',
            avatar: 'avatar.jpg',
          },
        },
      },
    ]

    it('should return all enrolled courses', async () => {
      ;(mockPrisma.userProgress.findMany as jest.Mock).mockResolvedValue(mockProgressRecords)
      ;(mockPrisma.userProgress.count as jest.Mock).mockResolvedValue(2)

      const result = await courseService.getUserCourses(userId)

      expect(result.courses).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should filter by status', async () => {
      const completedOnly = [mockProgressRecords[1]]
      ;(mockPrisma.userProgress.findMany as jest.Mock).mockResolvedValue(completedOnly)
      ;(mockPrisma.userProgress.count as jest.Mock).mockResolvedValue(1)

      const result = await courseService.getUserCourses(userId, 'COMPLETED' as any)

      expect(result.courses).toHaveLength(1)
      expect(result.courses[0].status).toBe('COMPLETED')
      expect(result.total).toBe(1)
    })

    it('should return empty array for user with no enrollments', async () => {
      ;(mockPrisma.userProgress.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.userProgress.count as jest.Mock).mockResolvedValue(0)

      const result = await courseService.getUserCourses('user-no-courses')

      expect(result.courses).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getCategories', () => {
    it('should return list of categories', async () => {
      const mockCategories = ['Programming', 'Data Science', 'Design']
      jest.spyOn(CourseRepository.prototype, 'getCategories').mockResolvedValue(mockCategories)

      const result = await courseService.getCategories()

      expect(result).toEqual(mockCategories)
      expect(result).toHaveLength(3)
    })

    it('should return empty array when no categories exist', async () => {
      jest.spyOn(CourseRepository.prototype, 'getCategories').mockResolvedValue([])

      const result = await courseService.getCategories()

      expect(result).toEqual([])
    })
  })

  describe('getTags', () => {
    it('should return list of tags', async () => {
      const mockTags = ['javascript', 'python', 'react', 'nodejs']
      jest.spyOn(CourseRepository.prototype, 'getTags').mockResolvedValue(mockTags)

      const result = await courseService.getTags()

      expect(result).toEqual(mockTags)
      expect(result).toHaveLength(4)
    })

    it('should return empty array when no tags exist', async () => {
      jest.spyOn(CourseRepository.prototype, 'getTags').mockResolvedValue([])

      const result = await courseService.getTags()

      expect(result).toEqual([])
    })
  })
})

import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import { createCourse, createCourses } from '../factories/course.factory'
import { CourseService } from '../../src/services/CourseService'

const mockCourseService = {
  listCourses: jest.fn(),
  getCourse: jest.fn(),
  enroll: jest.fn(),
  updateProgress: jest.fn(),
  getFeaturedCourses: jest.fn(),
  getUserCourses: jest.fn(),
  getCategories: jest.fn(),
  getTags: jest.fn(),
} as any

jest.mock('../../src/services/CourseService', () => ({
  CourseService: jest.fn().mockImplementation(() => mockCourseService),
}))

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn(),
    coursesListKey: jest.fn().mockReturnValue('mock-courses-list-key'),
    courseKey: jest.fn().mockReturnValue('mock-course-key'),
    userProgressKey: jest.fn().mockReturnValue('mock-progress-key'),
  },
}))

describe('CoursesController', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any
  })

  describe('listCourses', () => {
    it('should return list of courses', async () => {
      const courses = createCourses(3)
      const pagination = {
        total: 3,
        page: 1,
        limit: 20,
        pages: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }

      mockReq.query = {}
      mockCourseService.listCourses.mockResolvedValue({ courses, pagination })

      const { listCourses } = await import('../../src/controllers/coursesController')
      await listCourses(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: expect.any(Array),
        meta: pagination,
      })
    })

    it('should filter courses by search query', async () => {
      const courses = createCourses(1)
      const pagination = {
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }

      mockReq.query = { search: 'typescript' }
      mockCourseService.listCourses.mockResolvedValue({ courses, pagination })

      const { listCourses } = await import('../../src/controllers/coursesController')
      await listCourses(mockReq, mockRes)

      expect(mockCourseService.listCourses).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'typescript',
        })
      )
    })

    it('should filter courses by difficulty', async () => {
      const courses = [createCourse({ difficulty: 'ADVANCED' })]
      const pagination = {
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      }

      mockReq.query = { difficulty: 'advanced' }
      mockCourseService.listCourses.mockResolvedValue({ courses, pagination })

      const { listCourses } = await import('../../src/controllers/coursesController')
      await listCourses(mockReq, mockRes)

      expect(mockCourseService.listCourses).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'ADVANCED',
        })
      )
    })
  })

  describe('getCourseDetails', () => {
    it('should return course details with sections and lessons', async () => {
      const course = createCourse()
      const userProgress = { progress: 50, status: 'IN_PROGRESS', completedAt: null }
      const mockCourseWithProgress = {
        ...course,
        modules: [
          {
            id: 'mod-1',
            title: 'Module 1',
            lessons: [
              {
                id: 'les-1',
                title: 'Lesson 1',
                duration: 300,
                order: 1,
                isFree: true,
                videoUrl: 'url',
              },
            ],
          },
        ],
        studentCount: 100,
        rating: 4.5,
        reviewCount: 10,
        userProgress,
        instructor: { id: 'inst-1', username: 'instructor', avatar: null, bio: null },
      }

      mockReq.params = { id: course.id }
      mockReq.user = { userId: 'user-1' } as any
      mockCourseService.getCourse.mockResolvedValue(mockCourseWithProgress as any)

      const { getCourseDetails } = await import('../../src/controllers/coursesController')
      await getCourseDetails(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          id: course.id,
          title: course.title,
        }),
      })
    })

    it('should return 404 for non-existent course', async () => {
      mockReq.params = { id: 'non-existent' }
      mockCourseService.getCourse.mockResolvedValue(null)

      const { getCourseDetails } = await import('../../src/controllers/coursesController')
      await getCourseDetails(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Course not found',
          code: 'NOT_FOUND',
        })
      )
    })
  })
})

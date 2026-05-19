import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  listCourses,
  getCourseDetails,
  getCourseReviews,
} from '../../src/controllers/coursesController'
import { prisma } from '../../src/prismaClient'
import { createCourse, createCourses } from '../factories/course.factory'
import { createUser } from '../factories/user.factory'

jest.mock('../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}))

describe('CoursesController', () => {
  let mockReq: DeepMockProxy<Request>
  let mockRes: DeepMockProxy<Response>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    mockReq = mockDeep<Request>()
    mockRes = mockDeep<Response>()
    mockRes.status = statusMock as any
    mockRes.json = jsonMock as any

    jest.clearAllMocks()
  })

  describe('listCourses', () => {
    it('should return list of courses', async () => {
      const courses = createCourses(3)

      mockReq.query = {}
      ;(prisma.course.findMany as jest.Mock).mockResolvedValue(courses)
      ;(prisma.course.count as jest.Mock).mockResolvedValue(3)

      await listCourses(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: expect.any(Array),
        meta: {
          total: 3,
          page: 1,
          limit: 20,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      })
    })

    it('should filter courses by search query', async () => {
      const courses = [createCourse({ title: 'JavaScript Course' })]

      mockReq.query = { search: 'javascript' }
      ;(prisma.course.findMany as jest.Mock).mockResolvedValue(courses)
      ;(prisma.course.count as jest.Mock).mockResolvedValue(1)

      await listCourses(mockReq, mockRes)

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      )
    })

    it('should filter courses by difficulty', async () => {
      const courses = [createCourse({ difficulty: 'ADVANCED' })]

      mockReq.query = { difficulty: 'ADVANCED' }
      ;(prisma.course.findMany as jest.Mock).mockResolvedValue(courses)
      ;(prisma.course.count as jest.Mock).mockResolvedValue(1)

      await listCourses(mockReq, mockRes)

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficulty: 'ADVANCED',
          }),
        })
      )
    })
  })

  describe('getCourseDetails', () => {
    it('should return course details with sections and lessons', async () => {
      const course = createCourse({ id: 'course-123' })

      mockReq.params = { id: course.id }
      ;(prisma.course.findUnique as jest.Mock).mockResolvedValue(course)

      await getCourseDetails(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      // Response should be transformed to CourseDetails shape
      const expectedData = expect.objectContaining({
        id: course.id,
        title: course.title,
        description: course.description,
        sections: expect.any(Array),
        instructor: expect.objectContaining({
          display_name: expect.any(String),
        }),
      })
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: expectedData,
      })
    })

    it('should return 404 for non-existent course', async () => {
      mockReq.params = { id: 'non-existent' }
      ;(prisma.course.findUnique as jest.Mock).mockResolvedValue(null)

      await getCourseDetails(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Course not found',
      })
    })
  })

  describe('getCourseReviews', () => {
    it('should return empty reviews array', async () => {
      mockReq.params = { id: 'course-123' }
      ;(prisma.course.findUnique as jest.Mock).mockResolvedValue({
        reviewCount: 0,
        rating: 0,
      })

      await getCourseReviews(mockReq, mockRes)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: [],
        meta: { total: 0, average_rating: 0, page: 1, pages: 0 },
      })
    })
  })
})

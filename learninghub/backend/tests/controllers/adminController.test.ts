import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  getDashboardStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getSystemStatus,
  getAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  getCourseAnalytics,
  generateAICourse,
} from '../../src/controllers/adminController'
import { prisma } from '../../src/prismaClient'
import { createUser, createAdmin } from '../factories/user.factory'

// Mock logger - jest.mock is hoisted, so the factory creates mocks inline
jest.mock('../../src/utils/logger', () => {
  const log = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  }
  return { __esModule: true, logger: log, default: log }
})

describe('AdminController', () => {
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
  })

  describe('getDashboardStats', () => {
    it('should return dashboard stats successfully', async () => {
      const admin = createAdmin({ id: 'admin-123' })
      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      ;(prisma.user.count as jest.Mock).mockResolvedValueOnce(100) // total users
      ;(prisma.user.count as jest.Mock).mockResolvedValueOnce(50) // active users
      ;(prisma.user.count as jest.Mock).mockResolvedValueOnce(5) // new users today
      ;(prisma.testResult.count as jest.Mock).mockResolvedValueOnce(25) // test submissions

      await getDashboardStats(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          total_users: 100,
          active_users_24h: 50,
          new_users_today: 5,
          test_submissions_24h: 25,
          total_revenue: null,
          revenue_today: null,
          revenue_tracking_enabled: false,
        },
      })
    })

    it('should return 500 on database error', async () => {
      mockReq.user = { userId: 'admin-123', email: 'admin@test.com', role: 'ADMIN' }
      ;(prisma.user.count as jest.Mock).mockRejectedValue(new Error('Database error'))

      await getDashboardStats(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    })
  })

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const admin = createAdmin({ id: 'admin-123' })
      const users = [
        createUser({ id: 'user-1', email: 'user1@test.com' }),
        createUser({ id: 'user-2', email: 'user2@test.com' }),
      ]

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.query = { page: '1', limit: '20' }
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(users)
      ;(prisma.user.count as jest.Mock).mockResolvedValue(2)

      await getUsers(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: expect.any(Array),
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        },
      })
    })

    it('should filter users by search query', async () => {
      const admin = createAdmin({ id: 'admin-123' })
      const users = [createUser({ id: 'user-1', email: 'search@test.com' })]

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.query = { search: 'search' }
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(users)
      ;(prisma.user.count as jest.Mock).mockResolvedValue(1)

      await getUsers(mockReq as any, mockRes as any, jest.fn())

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      )
    })
  })

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const admin = createAdmin({ id: 'admin-123' })
      const user = createUser({ id: 'user-456', role: 'STUDENT' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: user.id }
      mockReq.body = { role: 'INSTRUCTOR' }
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        ...user,
        role: 'INSTRUCTOR',
      })

      await updateUserRole(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'User role updated successfully',
        data: expect.objectContaining({ role: 'INSTRUCTOR' }),
      })
    })

    it('should return 400 for invalid role', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: 'user-456' }
      mockReq.body = { role: 'invalid_role' }

      await updateUserRole(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid role',
        code: 'VALIDATION_ERROR',
      })
    })

    it('should return 500 on database error', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: 'user-456' }
      mockReq.body = { role: 'INSTRUCTOR' }
      ;(prisma.user.update as jest.Mock).mockRejectedValue(new Error('Database error'))

      await updateUserRole(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const admin = createAdmin({ id: 'admin-123' })
      const user = createUser({ id: 'user-456', role: 'STUDENT' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: user.id }
      // New flow: findUnique (privilege guard) → $transaction (cascade delete)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: user.role,
        username: user.username,
      })
      ;(prisma.$transaction as jest.Mock).mockResolvedValue([])

      await deleteUser(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        message: 'User deleted successfully',
        data: null,
      })
    })

    it('should prevent self-deletion', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: admin.id } // Trying to delete self

      await deleteUser(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Cannot delete your own account',
        code: 'VALIDATION_ERROR',
      })
    })

    it('should return 404 when target user not found', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: 'user-456' }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await deleteUser(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found',
        code: 'NOT_FOUND',
      })
    })

    it('should return 500 on database error', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      mockReq.params = { id: 'user-456' }
      // findUnique succeeds (user exists), but $transaction fails
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'STUDENT',
        username: 'testuser',
      })
      ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Database error'))

      await deleteUser(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    })
  })

  describe('getSystemStatus', () => {
    it('should return system status when database is connected', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([{ 1: 1 }])

      await getSystemStatus(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          database: 'connected',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        },
      })
    })

    it('should return 500 when database is disconnected', async () => {
      const admin = createAdmin({ id: 'admin-123' })

      mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
      ;(prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'))

      await getSystemStatus(mockReq as any, mockRes as any, jest.fn())

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'System check failed',
        code: 'INTERNAL_ERROR',
      })
    })
  })

  describe('Course Management', () => {
    const admin = createAdmin({ id: 'admin-123' })

    describe('getAdminCourses', () => {
      it('should return mapped list of admin courses', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.query = { status: 'published', category: 'Algorithms' }

        const mockTests = [
          {
            id: 'test-1',
            title: 'DSA Masterclass',
            description: 'In-depth algorithms',
            difficulty: 'HARD',
            isPublished: true,
            timeLimit: 90,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-02T00:00:00Z'),
            exam: { id: 'exam-1', name: 'Algorithms', slug: 'algorithms' },
            _count: { results: 42 },
          },
        ]
        ;(prisma.test.findMany as jest.Mock).mockResolvedValue(mockTests)

        await getAdminCourses(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(jsonMock).toHaveBeenCalledWith({
          status: 'success',
          data: [
            expect.objectContaining({
              id: 'test-1',
              title: 'DSA Masterclass',
              level: 'advanced',
              difficulty: 'HARD',
              isPublished: true,
              published: true,
              studentCount: 42,
              enrolledCount: 42,
            }),
          ],
        })
      })
    })

    describe('createAdminCourse', () => {
      it('should validate title and reject empty submission', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.body = { title: '   ', level: 'Beginner' }

        await createAdminCourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Course title is required',
          })
        )
      })

      it('should successfully create a new course master', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.body = {
          title: 'Distributed Systems',
          description: 'Raft and Paxos consensus',
          level: 'Advanced',
          category: 'Backend',
        }

        ;(prisma.exam.findFirst as jest.Mock).mockResolvedValue({ id: 'exam-99', name: 'Backend' })
        ;(prisma.test.create as jest.Mock).mockResolvedValue({
          id: 'test-new-1',
          title: 'Distributed Systems',
          description: 'Raft and Paxos consensus',
          difficulty: 'HARD',
          isPublished: false,
          createdAt: new Date('2026-03-01T00:00:00Z'),
          exam: { id: 'exam-99', name: 'Backend' },
        })

        await createAdminCourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(201)
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'success',
            data: expect.objectContaining({
              id: 'test-new-1',
              title: 'Distributed Systems',
              level: 'advanced',
              status: 'draft',
            }),
          })
        )
      })
    })

    describe('updateAdminCourse', () => {
      it('should return 404 when target course not found', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.params = { id: 'missing-course-id' }
        mockReq.body = { published: true }

        ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)

        await updateAdminCourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(404)
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Course not found',
          })
        )
      })

      it('should update course metadata and publishing status', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.params = { id: 'test-1' }
        mockReq.body = { published: true, level: 'Intermediate' }

        ;(prisma.test.findUnique as jest.Mock).mockResolvedValue({ id: 'test-1' })
        ;(prisma.test.update as jest.Mock).mockResolvedValue({
          id: 'test-1',
          title: 'Updated Title',
          description: 'Updated Desc',
          difficulty: 'MEDIUM',
          isPublished: true,
          exam: { id: 'e1', name: 'Engineering' },
          _count: { results: 10 },
        })

        await updateAdminCourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'success',
            data: expect.objectContaining({
              id: 'test-1',
              level: 'intermediate',
              isPublished: true,
              published: true,
              studentCount: 10,
            }),
          })
        )
      })
    })

    describe('deleteAdminCourse', () => {
      it('should return 404 when course does not exist', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.params = { id: 'non-existent' }

        ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)

        await deleteAdminCourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(404)
      })

      it('should soft-delete course successfully', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.params = { id: 'test-to-delete' }

        ;(prisma.test.findUnique as jest.Mock).mockResolvedValue({
          id: 'test-to-delete',
          title: 'Legacy Course',
        })
        ;(prisma.test.update as jest.Mock).mockResolvedValue({ id: 'test-to-delete' })

        await deleteAdminCourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(prisma.test.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'test-to-delete' },
            data: expect.objectContaining({ isPublished: false }),
          })
        )
      })
    })

    describe('getCourseAnalytics', () => {
      it('should return aggregated popular courses and categories', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }

        ;(prisma.test.findMany as jest.Mock).mockResolvedValueOnce([
          { id: 'c1', title: 'Course 1', _count: { results: 50 } },
          { id: 'c2', title: 'Course 2', _count: { results: 30 } },
        ])
        ;(prisma.test.findMany as jest.Mock).mockResolvedValueOnce([
          { exam: { name: 'Engineering' } },
          { exam: { name: 'Engineering' } },
          { exam: { name: 'Mathematics' } },
        ])

        await getCourseAnalytics(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(200)
        expect(jsonMock).toHaveBeenCalledWith({
          status: 'success',
          data: {
            popular: [
              { id: 'c1', title: 'Course 1', enrollments: 50 },
              { id: 'c2', title: 'Course 2', enrollments: 30 },
            ],
            byCategory: [
              { category: 'Engineering', count: 2 },
              { category: 'Mathematics', count: 1 },
            ],
          },
        })
      })
    })

    describe('generateAICourse', () => {
      it('should reject empty prompts', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.body = { prompt: '' }

        await generateAICourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(400)
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'error',
            message: 'Course prompt is required',
          })
        )
      })

      it('should synthesize new course and questions based on prompt', async () => {
        mockReq.user = { userId: admin.id, email: admin.email, role: admin.role }
        mockReq.body = {
          prompt: 'Modern Cloud Architecture in AWS and Kubernetes',
          difficulty: 'ADVANCED',
          modulesCount: 2,
        }

        ;(prisma.exam.findFirst as jest.Mock).mockResolvedValue({ id: 'exam-cloud' })
        ;(prisma.test.create as jest.Mock).mockResolvedValue({
          id: 'ai-course-123',
          title: 'Modern Cloud Architecture in AWS and Kubernetes',
          isAiGenerated: true,
        })
        ;(prisma.question.create as jest.Mock).mockResolvedValue({ id: 'q-mod-1' })

        await generateAICourse(mockReq as any, mockRes as any, jest.fn())

        expect(statusMock).toHaveBeenCalledWith(201)
        expect(prisma.test.create).toHaveBeenCalled()
        expect(prisma.question.create).toHaveBeenCalledTimes(2)
        expect(jsonMock).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'success',
            data: expect.objectContaining({
              courseId: 'ai-course-123',
            }),
          })
        )
      })
    })
  })
})

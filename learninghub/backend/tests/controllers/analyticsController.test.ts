import { Request, Response } from 'express'
import { mockDeep, DeepMockProxy } from 'jest-mock-extended'
import {
  getLearnerDashboardStats,
  getLearningActivity,
} from '../../src/controllers/analyticsController'
import { prisma } from '../../src/prismaClient'

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  }

  return {
    ...mockLogger,
    default: mockLogger,
  }
})

describe('AnalyticsController learner endpoints', () => {
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
    mockReq.query = {}
  })

  describe('getLearnerDashboardStats', () => {
    it('returns learner stats from persisted progress and tests', async () => {
      mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        xp: 140,
        level: 4,
        streak: 3,
        longestStreak: 8,
      })
      ;(prisma.userProgress.findMany as jest.Mock).mockResolvedValue([
        { status: 'COMPLETED', timeSpentSeconds: 120 },
        { status: 'IN_PROGRESS', timeSpentSeconds: 180 },
      ])
      ;(prisma.testResult.aggregate as jest.Mock).mockResolvedValue({
        _avg: { percentage: 84.6 },
      })
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          topicName: 'Math',
          subjectName: 'Algebra',
          totalAttempts: 10,
          correctAnswers: 8,
          accuracy: 80,
        },
      ])

      await getLearnerDashboardStats(mockReq as any, mockRes)

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: {
          total_courses: 2,
          completed_courses: 1,
          in_progress_courses: 1,
          total_learning_time: 5,
          average_score: 85,
          current_streak: 3,
          longest_streak: 8,
          xp_points: 140,
          level: 4,
          topic_performance: [{ topic: 'Math', subject: 'Algebra', attempts: 10, accuracy: 80 }],
        },
      })
    })

    it('returns 404 when the authenticated user no longer exists', async () => {
      mockReq.user = { userId: 'missing-user', email: 'student@test.com', role: 'STUDENT' }
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.userProgress.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.testResult.aggregate as jest.Mock).mockResolvedValue({
        _avg: { percentage: null },
      })
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([])

      await getLearnerDashboardStats(mockReq as any, mockRes)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found',
        code: 'NOT_FOUND',
      })
    })
  })

  describe('getLearningActivity', () => {
    it('aggregates recent learning activity by day', async () => {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      mockReq.user = { userId: 'user-1', email: 'student@test.com', role: 'STUDENT' }
      mockReq.query = { days: '2' }
      ;(prisma.dailyGoal.findMany as jest.Mock).mockResolvedValue([
        { date: today, completedMinutes: 25 },
      ])
      ;(prisma.lessonCompletion.findMany as jest.Mock).mockResolvedValue([{ completedAt: today }])
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([
        { completedAt: today, passed: true, score: 14 },
        { completedAt: today, passed: false, score: 4 },
      ])
      ;(prisma.userProgress.findMany as jest.Mock).mockResolvedValue([{ lastActivityAt: today }])

      await getLearningActivity(mockReq as any, mockRes)

      expect(jsonMock).toHaveBeenCalledWith({
        status: 'success',
        data: expect.arrayContaining([
          expect.objectContaining({
            date: today.toISOString().split('T')[0],
            courses_accessed: 1,
            lessons_completed: 1,
            time_spent: 25,
            xp_earned: 14,
          }),
        ]),
      })
      expect(jsonMock.mock.calls[0][0].data).toHaveLength(2)
    })

    it('rejects activity requests without an authenticated user', async () => {
      mockReq.user = undefined

      await getLearningActivity(mockReq as any, mockRes)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication required',
        code: 'NO_TOKEN',
      })
    })
  })
})

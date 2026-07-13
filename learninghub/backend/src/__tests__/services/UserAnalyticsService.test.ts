import { UserAnalyticsService } from '../../services/UserAnalyticsService'
import { prisma } from '../../prismaClient'
import { topicPerformanceService } from '../../services/TopicPerformanceService'

jest.mock('../../prismaClient', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    testResult: {
      findMany: jest.fn(),
    },
    testAttemptAnswer: {
      count: jest.fn(),
    },
    userExamPreference: {
      findUnique: jest.fn(),
    },
    activityLog: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('../../services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    getTopicMasteryMap: jest.fn(),
  },
}))

describe('UserAnalyticsService', () => {
  let analyticsService: UserAnalyticsService
  const mockDate = new Date('2023-10-15T12:00:00Z')

  beforeEach(() => {
    analyticsService = new UserAnalyticsService()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getDashboardAnalytics', () => {
    it('should aggregate data successfully without throwing', async () => {
      // Arrange
      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue(null)

      // getSummary mocks
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([
        { percentage: 80, passed: true, timeTaken: 600, score: 80, totalPoints: 100 },
        { percentage: 60, passed: false, timeTaken: 300, score: 60, totalPoints: 100 },
      ])
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ streak: 5, longestStreak: 10 })
      ;(prisma.testAttemptAnswer.count as jest.Mock)
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(14) // correct

      ;(topicPerformanceService.getTopicMasteryMap as jest.Mock).mockResolvedValue({
        topics: [],
        weakTopics: [],
        strongTopics: [],
        overallAccuracy: 70,
        totalTopics: 2,
      })

      ;(prisma.activityLog.findMany as jest.Mock).mockResolvedValue([])

      // Act
      const result = await analyticsService.getDashboardAnalytics('user-1', 7)

      // Assert
      expect(result).toBeDefined()
      expect(result.summary.totalTestsCompleted).toBe(2)
      expect(result.summary.passRate).toBe(50)
      expect(result.summary.overallAccuracy).toBe(70) // 14/20 = 70%
      expect(result.summary.averageScore).toBe(70) // (80+60)/2
      expect(result.summary.totalStudyTimeMinutes).toBe(15) // 900 seconds = 15 mins
      expect(result.topicMastery.totalTopics).toBe(2)
    })
  })
})

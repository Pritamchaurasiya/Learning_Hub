import { RecommendationService } from '../../services/RecommendationService'
import { prisma } from '../../prismaClient'
import { topicPerformanceService } from '../../services/TopicPerformanceService'
import { cacheService } from '../../services/CacheService'

jest.mock('../../prismaClient', () => ({
  prisma: {
    userExamPreference: {
      findUnique: jest.fn(),
    },
    topicPerformance: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('../../services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    getWeakTopics: jest.fn(),
    getTopicsDueForReview: jest.fn(),
  },
}))

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    getOrSet: jest.fn((key, cb) => cb()),
    recommendationStudyKey: jest.fn().mockReturnValue('mock-key'),
    recommendationTestKey: jest.fn().mockReturnValue('mock-test-key'),
    recommendationRoadmapKey: jest.fn().mockReturnValue('mock-roadmap-key'),
  },
}))

describe('RecommendationService', () => {
  let recommendationService: RecommendationService
  const mockDate = new Date('2023-10-15T12:00:00Z')

  beforeEach(() => {
    recommendationService = new RecommendationService()
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(mockDate)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getStudyRecommendations', () => {
    it('should generate recommendations combining weak topics and review topics', async () => {
      // Arrange
      ;(topicPerformanceService.getWeakTopics as jest.Mock).mockResolvedValue([
        {
          topicName: 'Math',
          accuracy: 40,
          lastAttemptAt: new Date(Date.now() - 5 * 86400000),
          totalAttempts: 3,
        },
      ])

      ;(topicPerformanceService.getTopicsDueForReview as jest.Mock).mockResolvedValue([
        {
          topicName: 'Science',
          accuracy: 85,
          lastAttemptAt: new Date(Date.now() - 10 * 86400000),
          totalAttempts: 5,
        },
      ])

      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue(null) // No exam prefs

      // Act
      const recs = await recommendationService.getStudyRecommendations('user-1')

      // Assert
      expect(recs.length).toBe(2)
      expect(recs[0].topicName).toBe('Math') // weak topics come first
      expect(recs[0].type).toBe('weak_area')
      expect(recs[1].topicName).toBe('Science')
      expect(recs[1].type).toBe('review_due')
    })
  })
})

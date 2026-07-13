import {
  TopicPerformanceService,
  calculateStrengthLevel,
} from '../../src/services/TopicPerformanceService'
import { prisma } from '../../src/prismaClient'
import { cacheService } from '../../src/services/CacheService'

jest.mock('../../src/prismaClient', () => ({
  prisma: {
    topicPerformance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userExamPreference: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    delete: jest.fn().mockResolvedValue(undefined),
    topicMasteryKey: jest.fn((id: string) => `mastery_${id}`),
    topicWeakKey: jest.fn((id: string) => `weak_${id}`),
    topicReviewKey: jest.fn((id: string) => `review_${id}`),
    recommendationStudyKey: jest.fn((id: string) => `rec_study_${id}`),
    recommendationTestKey: jest.fn((id: string) => `rec_test_${id}`),
    recommendationRoadmapKey: jest.fn((id: string) => `rec_roadmap_${id}`),
    recommendationSpacedKey: jest.fn((id: string) => `rec_spaced_${id}`),
    getOrSet: jest.fn((key, fetcher) => fetcher()),
  },
}))

jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  return { ...mockLogger, default: mockLogger }
})

describe('TopicPerformanceService Suite', () => {
  let service: TopicPerformanceService

  beforeEach(() => {
    jest.clearAllMocks()
    if (prisma.$transaction && (prisma.$transaction as jest.Mock).mockReset) {
      (prisma.$transaction as jest.Mock).mockReset()
    }
    jest.useFakeTimers()
    service = new TopicPerformanceService()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('calculateStrengthLevel', () => {
    it('should return unknown for 0, negative, or NaN totalAttempts', () => {
      expect(calculateStrengthLevel(80, 0)).toBe('unknown')
      expect(calculateStrengthLevel(80, -5)).toBe('unknown')
      expect(calculateStrengthLevel(80, NaN)).toBe('unknown')
    })

    it('should return unknown for NaN or Infinity accuracy', () => {
      expect(calculateStrengthLevel(NaN, 5)).toBe('unknown')
      expect(calculateStrengthLevel(Infinity, 5)).toBe('unknown')
    })

    it('should return developing when totalAttempts < 3 regardless of accuracy', () => {
      expect(calculateStrengthLevel(100, 1)).toBe('developing')
      expect(calculateStrengthLevel(100, 2)).toBe('developing')
      expect(calculateStrengthLevel(10, 2)).toBe('developing')
    })

    it('should assign strength levels correctly when totalAttempts >= 3', () => {
      expect(calculateStrengthLevel(85, 5)).toBe('mastered')
      expect(calculateStrengthLevel(80, 3)).toBe('mastered')
      expect(calculateStrengthLevel(75, 4)).toBe('proficient')
      expect(calculateStrengthLevel(60, 3)).toBe('proficient')
      expect(calculateStrengthLevel(50, 10)).toBe('developing')
      expect(calculateStrengthLevel(40, 3)).toBe('developing')
      expect(calculateStrengthLevel(35, 5)).toBe('weak')
      expect(calculateStrengthLevel(0, 5)).toBe('weak')
    })
  })

  describe('updateForSingleAnswer', () => {
    it('should create new topicPerformance record when none exists', async () => {
      ;(prisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.topicPerformance.create as jest.Mock).mockResolvedValue({})

      await service.updateForSingleAnswer('user-1', 'Calculus', true, {
        subjectName: 'Math',
        timeSpentSeconds: 45,
      })

      expect(prisma.topicPerformance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          topicId: 'Calculus',
          topicName: 'Calculus',
          subjectName: 'Math',
          totalAttempts: 1,
          correctAnswers: 1,
          accuracy: 100,
          avgTimeSeconds: 45,
          strengthLevel: 'developing',
        }),
      })
      jest.advanceTimersByTime(30000)
      expect(cacheService.delete).toHaveBeenCalledTimes(7)
    })

    it('should update existing record and accumulate accuracy and average time', async () => {
      ;(prisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue({
        id: 'record-1',
        totalAttempts: 3,
        correctAnswers: 2,
        avgTimeSeconds: 30,
        subjectName: 'Math',
      })
      ;(prisma.topicPerformance.update as jest.Mock).mockResolvedValue({})

      // 4th attempt, wrong answer (isCorrect = false), timeSpent = 50s
      // newTotal = 4, newCorrect = 2 -> 50% accuracy -> developing
      // newAvgTime = (30 * 3 + 50) / 4 = 140 / 4 = 35s
      await service.updateForSingleAnswer('user-1', 'Calculus', false, {
        timeSpentSeconds: 50,
      })

      expect(prisma.topicPerformance.update).toHaveBeenCalledWith({
        where: { id: 'record-1' },
        data: expect.objectContaining({
          totalAttempts: 4,
          correctAnswers: 2,
          accuracy: 50,
          avgTimeSeconds: 35,
          strengthLevel: 'developing',
        }),
      })
    })

    it('should catch database errors gracefully without throwing', async () => {
      ;(prisma.topicPerformance.findUnique as jest.Mock).mockRejectedValue(new Error('DB failure'))

      await expect(service.updateForSingleAnswer('user-1', 'Calculus', true)).resolves.not.toThrow()
    })
  })

  describe('updateForTestResults', () => {
    it('should batch results by topic and execute transactional updates and creates', async () => {
      const results = [
        { questionId: 'q1', topicName: 'Algebra', isCorrect: true, timeSpentSeconds: 20 },
        { questionId: 'q2', topicName: 'Algebra', isCorrect: false, timeSpentSeconds: 40 },
        { questionId: 'q3', topicName: 'Geometry', isCorrect: true, timeSpentSeconds: 30 },
      ]

      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'topic-alg',
          topicName: 'Algebra',
          totalAttempts: 2,
          correctAnswers: 2,
          avgTimeSeconds: 30,
        },
      ])
      ;(prisma.$transaction as jest.Mock).mockResolvedValue(undefined)

      await service.updateForTestResults('user-1', results)

      const logger = require('../../src/utils/logger').default
      if (logger.error.mock.calls.length > 0) {
        console.error('TopicPerformanceService ERROR:', logger.error.mock.calls)
      }

      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      const operations = (prisma.$transaction as jest.Mock).mock.calls[0][0]
      expect(operations).toHaveLength(2) // 1 update for Algebra, 1 create for Geometry
    })
  })

  describe('getTopicMasteryMap', () => {
    it('should return topics, weakTopics, strongTopics, and overallAccuracy', async () => {
      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          topicName: 'Algebra',
          totalAttempts: 5,
          correctAnswers: 4,
          accuracy: 80,
          avgTimeSeconds: 20,
          strengthLevel: 'mastered',
          lastAttemptAt: new Date(),
        },
        {
          topicName: 'Geometry',
          totalAttempts: 4,
          correctAnswers: 1,
          accuracy: 25,
          avgTimeSeconds: 40,
          strengthLevel: 'weak',
          lastAttemptAt: new Date(),
        },
        {
          topicName: 'Calculus',
          totalAttempts: 2,
          correctAnswers: 1,
          accuracy: 50,
          avgTimeSeconds: 30,
          strengthLevel: 'developing',
          lastAttemptAt: new Date(),
        },
      ])

      const map = await service.getTopicMasteryMap('user-1')

      expect(map.totalTopics).toBe(3)
      expect(map.strongTopics).toHaveLength(1) // Algebra
      expect(map.weakTopics).toHaveLength(1) // Geometry
      expect(map.overallAccuracy).toBe(Math.round((6 / 11) * 100 * 100) / 100) // 54.55%
    })
  })

  describe('recalculateStrengthLevels', () => {
    it('should update out-of-sync records and return count of updated records', async () => {
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        { id: 't1', accuracy: 85, totalAttempts: 5, strengthLevel: 'weak' }, // Should be mastered
        { id: 't2', accuracy: 50, totalAttempts: 4, strengthLevel: 'developing' }, // Already correct
      ])
      ;(prisma.topicPerformance.update as jest.Mock).mockResolvedValue({})

      const updatedCount = await service.recalculateStrengthLevels('user-1')

      expect(updatedCount).toBe(1)
      expect(prisma.topicPerformance.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { strengthLevel: 'mastered' },
      })
    })
  })
})

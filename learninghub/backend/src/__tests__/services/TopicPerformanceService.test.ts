/**
 * TopicPerformanceService Unit Tests
 *
 * Covers:
 *  - calculateStrengthLevel: pure function edge cases
 *  - updateForSingleAnswer: create new, update existing, error handling
 *  - updateForTestResults: batch update with grouping
 *  - getWeakTopics
 *  - getTopicMasteryMap
 */

import {
  TopicPerformanceService,
  calculateStrengthLevel,
} from '../../services/TopicPerformanceService'
import { prisma } from '../../prismaClient'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../prismaClient', () => ({
  prisma: {
    topicPerformance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userExamPreference: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    // getOrSet should call the callback and return its result (simulates cache miss)
    getOrSet: jest.fn(async (_key: string, cb: Function) => cb()),
    topicMasteryKey: jest.fn((uid: string) => `topic:mastery:${uid}`),
    topicWeakKey: jest.fn((uid: string) => `topic:weak:${uid}`),
    topicReviewKey: jest.fn((uid: string) => `topic:review:${uid}`),
    recommendationStudyKey: jest.fn((uid: string) => `rec:study:${uid}`),
    recommendationTestKey: jest.fn((uid: string) => `rec:test:${uid}`),
    recommendationRoadmapKey: jest.fn((uid: string) => `rec:roadmap:${uid}`),
    recommendationSpacedKey: jest.fn((uid: string) => `rec:spaced:${uid}`),
    generateKey: jest.fn().mockReturnValue('mock-key'),
  },
}))

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('TopicPerformanceService', () => {
  let service: TopicPerformanceService

  beforeEach(() => {
    service = new TopicPerformanceService()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  // ── calculateStrengthLevel (pure function) ────────────────────────────────

  describe('calculateStrengthLevel', () => {
    it('should return "unknown" for 0 or negative totalAttempts', () => {
      expect(calculateStrengthLevel(50, 0)).toBe('unknown')
      expect(calculateStrengthLevel(50, -1)).toBe('unknown')
    })

    it('should return "unknown" for non-finite accuracy', () => {
      expect(calculateStrengthLevel(NaN, 5)).toBe('unknown')
      expect(calculateStrengthLevel(Infinity, 5)).toBe('unknown')
    })

    it('should return "developing" for fewer than 3 attempts regardless of accuracy', () => {
      expect(calculateStrengthLevel(100, 1)).toBe('developing')
      expect(calculateStrengthLevel(100, 2)).toBe('developing')
    })

    it('should return "mastered" for >=80% accuracy with >=3 attempts', () => {
      expect(calculateStrengthLevel(80, 10)).toBe('mastered')
      expect(calculateStrengthLevel(95, 5)).toBe('mastered')
    })

    it('should return "proficient" for 60-79% accuracy with >=3 attempts', () => {
      expect(calculateStrengthLevel(60, 5)).toBe('proficient')
      expect(calculateStrengthLevel(79, 3)).toBe('proficient')
    })

    it('should return "developing" for 40-59% accuracy with >=3 attempts', () => {
      expect(calculateStrengthLevel(40, 5)).toBe('developing')
      expect(calculateStrengthLevel(59, 3)).toBe('developing')
    })

    it('should return "weak" for <40% accuracy with >=3 attempts', () => {
      expect(calculateStrengthLevel(0, 10)).toBe('weak')
      expect(calculateStrengthLevel(39, 5)).toBe('weak')
    })
  })

  // ── updateForSingleAnswer ─────────────────────────────────────────────────

  describe('updateForSingleAnswer', () => {
    it('should create a new topic performance record when none exists', async () => {
      ;(prisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.topicPerformance.create as jest.Mock).mockResolvedValue({})

      await service.updateForSingleAnswer('user-1', 'Algebra', true, {
        timeSpentSeconds: 30,
      })

      expect(prisma.topicPerformance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            topicId: 'Algebra',
            topicName: 'Algebra',
            totalAttempts: 1,
            correctAnswers: 1,
            accuracy: 100,
            avgTimeSeconds: 30,
            strengthLevel: 'developing', // <3 attempts
          }),
        })
      )
    })

    it('should update an existing topic performance record', async () => {
      ;(prisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue({
        id: 'tp-1',
        totalAttempts: 4,
        correctAnswers: 3,
        accuracy: 75,
        avgTimeSeconds: 20,
        subjectName: 'Math',
      })
      ;(prisma.topicPerformance.update as jest.Mock).mockResolvedValue({})

      await service.updateForSingleAnswer('user-1', 'Algebra', false, {
        timeSpentSeconds: 40,
      })

      // New: totalAttempts=5, correctAnswers=3 (wrong answer), accuracy=60%
      expect(prisma.topicPerformance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tp-1' },
          data: expect.objectContaining({
            totalAttempts: 5,
            correctAnswers: 3,
            accuracy: 60, // (3/5)*100 = 60
            strengthLevel: 'proficient', // >=60%, >=3 attempts
          }),
        })
      )
    })

    it('should not throw when database operation fails (logs error instead)', async () => {
      ;(prisma.topicPerformance.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB Connection lost')
      )

      // Should not throw
      await expect(
        service.updateForSingleAnswer('user-1', 'Physics', true)
      ).resolves.toBeUndefined()
    })
  })

  // ── updateForTestResults (batch) ──────────────────────────────────────────

  describe('updateForTestResults', () => {
    it('should group questions by topic and batch update', async () => {
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.topicPerformance.create as jest.Mock).mockResolvedValue({})
      ;(prisma.$transaction as jest.Mock).mockResolvedValue([])

      await service.updateForTestResults('user-1', [
        { questionId: 'q1', topicName: 'Algebra', isCorrect: true, timeSpentSeconds: 30 },
        { questionId: 'q2', topicName: 'Algebra', isCorrect: false, timeSpentSeconds: 25 },
        { questionId: 'q3', topicName: 'Geometry', isCorrect: true, timeSpentSeconds: 15 },
      ])

      // Should create 2 topic records: Algebra and Geometry
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      // The transaction receives an array of promises
      const transactionArg = (prisma.$transaction as jest.Mock).mock.calls[0][0]
      expect(transactionArg).toHaveLength(2) // 2 topics
    })

    it('should not call $transaction when there are no results', async () => {
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([])

      await service.updateForTestResults('user-1', [])

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  // ── getWeakTopics ─────────────────────────────────────────────────────────

  describe('getWeakTopics', () => {
    it('should return topics with accuracy < 60% and >= 3 attempts', async () => {
      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          topicName: 'Calculus',
          subjectName: 'Math',
          totalAttempts: 10,
          correctAnswers: 3,
          accuracy: 30,
          avgTimeSeconds: 45,
          strengthLevel: 'weak',
          lastAttemptAt: new Date(),
        },
      ])

      const result = await service.getWeakTopics('user-1', 5)

      expect(result).toHaveLength(1)
      expect(result[0].topicName).toBe('Calculus')
      expect(result[0].accuracy).toBe(30)
      expect(result[0].strengthLevel).toBe('weak')
    })

    it('should return empty array when user has no weak topics', async () => {
      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getWeakTopics('user-1')

      expect(result).toEqual([])
    })
  })

  // ── getTopicMasteryMap ────────────────────────────────────────────────────

  describe('getTopicMasteryMap', () => {
    it('should return structured mastery map with computed fields', async () => {
      ;(prisma.userExamPreference.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          topicName: 'Algebra',
          subjectName: 'Math',
          totalAttempts: 10,
          correctAnswers: 9,
          accuracy: 90,
          avgTimeSeconds: 20,
          strengthLevel: 'mastered',
          lastAttemptAt: new Date(),
        },
        {
          topicName: 'Calculus',
          subjectName: 'Math',
          totalAttempts: 10,
          correctAnswers: 2,
          accuracy: 20,
          avgTimeSeconds: 50,
          strengthLevel: 'weak',
          lastAttemptAt: new Date(),
        },
      ])

      const result = await service.getTopicMasteryMap('user-1')

      expect(result.totalTopics).toBe(2)
      expect(result.weakTopics).toHaveLength(1)
      expect(result.weakTopics[0].topicName).toBe('Calculus')
      expect(result.strongTopics).toHaveLength(1)
      expect(result.strongTopics[0].topicName).toBe('Algebra')
      // Overall: (9+2)/(10+10) * 100 = 55%
      expect(result.overallAccuracy).toBe(55)
    })
  })
})

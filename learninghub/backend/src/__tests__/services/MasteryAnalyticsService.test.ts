/**
 * MasteryAnalyticsService Unit Tests
 *
 * Covers:
 *  - updateTopicMasteryFromResponses: Batched in-memory BKT calculations and single atomic transaction
 *  - updateDailyStatsFromResponses: Daily study time and accuracy aggregation
 *  - captureWeakStrongSnapshots: Weak vs strong topic categorization
 */

import { MasteryAnalyticsService } from '../../engines/analytics/MasteryAnalyticsService'
import { prisma } from '../../prismaClient'
import { cacheService } from '../../services/CacheService'
import { jobQueueService } from '../../services/JobQueueService'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../prismaClient', () => ({
  prisma: {
    topicPerformance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userDailyStats: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userAreaSnapshot: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    delete: jest.fn().mockResolvedValue(undefined),
    topicMasteryKey: jest.fn((uid: string) => `topic:mastery:${uid}`),
    topicWeakKey: jest.fn((uid: string) => `topic:weak:${uid}`),
    topicReviewKey: jest.fn((uid: string) => `topic:review:${uid}`),
  },
}))

jest.mock('../../services/JobQueueService', () => ({
  jobQueueService: {
    addAIJob: jest.fn().mockResolvedValue(undefined),
  },
}))

describe('MasteryAnalyticsService (High Performance Batching)', () => {
  let service: MasteryAnalyticsService

  beforeEach(() => {
    service = new MasteryAnalyticsService()
    jest.clearAllMocks()
  })

  describe('updateTopicMasteryFromResponses', () => {
    it('should batch fetch existing topics and execute in a single atomic transaction', async () => {
      // Mock existing record for Topic A, but none for Topic B
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'rec-topic-a',
          userId: 'user-123',
          topicId: 'topic-a',
          topicName: 'Algebra',
          subjectName: 'Mathematics',
          accuracy: 50.0,
          totalAttempts: 5,
          correctAnswers: 3,
          avgTimeSeconds: 40.0,
          strengthLevel: 'developing',
          lastAttemptAt: new Date('2026-01-01T10:00:00Z'),
        },
      ])

      ;(prisma.$transaction as jest.Mock).mockResolvedValue([])

      const responses = [
        {
          topicId: 'topic-a',
          topicName: 'Algebra',
          subjectId: 'sub-math',
          subjectName: 'Mathematics',
          isCorrect: true,
          timeSpentSeconds: 30,
          completedAt: new Date('2026-01-02T10:00:00Z'),
        },
        {
          topicId: 'topic-a',
          topicName: 'Algebra',
          subjectId: 'sub-math',
          subjectName: 'Mathematics',
          isCorrect: true,
          timeSpentSeconds: 25,
          completedAt: new Date('2026-01-02T10:01:00Z'),
        },
        {
          topicId: 'topic-b',
          topicName: 'Calculus',
          subjectId: 'sub-math',
          subjectName: 'Mathematics',
          isCorrect: false,
          timeSpentSeconds: 60,
          completedAt: new Date('2026-01-02T10:02:00Z'),
        },
      ]

      await service.updateTopicMasteryFromResponses('user-123', responses)

      // 1. Should perform ONE batch query for all unique topics
      expect(prisma.topicPerformance.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.topicPerformance.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          topicId: { in: ['topic-a', 'topic-b'] },
        },
      })

      // 2. Should execute all DB mutations in ONE transaction
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      const operations = (prisma.$transaction as jest.Mock).mock.calls[0][0]
      expect(Array.isArray(operations)).toBe(true)
      expect(operations.length).toBe(2) // 1 update for topic-a, 1 create for topic-b

      // 3. Should invalidate caches
      expect(cacheService.delete).toHaveBeenCalledWith('topic:mastery:user-123')
      expect(cacheService.delete).toHaveBeenCalledWith('topic_performance:user-123')

      // 4. Should dispatch background AI jobs
      expect(jobQueueService.addAIJob).toHaveBeenCalled()
    })

    it('should gracefully handle empty responses array', async () => {
      await service.updateTopicMasteryFromResponses('user-123', [])
      expect(prisma.topicPerformance.findMany).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('captureWeakStrongSnapshots', () => {
    it('should correctly segment weak and strong areas into user snapshots', async () => {
      ;(prisma.topicPerformance.findMany as jest.Mock).mockResolvedValue([
        {
          topicId: 't1',
          topicName: 'Thermodynamics',
          accuracy: 25.0,
          totalAttempts: 10,
          strengthLevel: 'weak',
        },
        {
          topicId: 't2',
          topicName: 'Optics',
          accuracy: 95.0,
          totalAttempts: 12,
          strengthLevel: 'mastered',
        },
      ])

      ;(prisma.userAreaSnapshot.create as jest.Mock).mockResolvedValue({})

      await service.captureWeakStrongSnapshots('user-123')

      expect(prisma.userAreaSnapshot.create).toHaveBeenCalledTimes(2)
      expect(prisma.userAreaSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            type: 'WEAK',
          }),
        })
      )
      expect(prisma.userAreaSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            type: 'STRONG',
          }),
        })
      )
    })
  })
})

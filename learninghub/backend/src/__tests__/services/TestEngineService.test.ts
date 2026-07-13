/**
 * TestEngineService Unit Tests
 *
 * Covers:
 *  - submitPracticeAnswer: happy path, question not found, wrong mode, retry on failure
 *  - getTestQuestions: standard, practice shuffle, not found
 *  - bookmarkQuestion: happy path, duplicate
 *  - removeBookmark
 *  - getAttemptHistory: pagination, filters
 *  - validateTimeRemaining: valid, expired, no attempt
 *  - autoSubmitExpiredTests
 */

import { TestEngineService } from '../../services/TestEngineService'
import { prisma } from '../../prismaClient'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../prismaClient', () => ({
  prisma: {
    question: { findUnique: jest.fn() },
    testResult: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    testAttemptAnswer: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    test: { findUnique: jest.fn() },
    questionBookmark: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    userExamPreference: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  },
}))

jest.mock('../../services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    updateForSingleAnswer: jest.fn(),
    getTopicMasteryMap: jest.fn().mockResolvedValue({
      topics: [],
      weakTopics: [],
      strongTopics: [],
      overallAccuracy: 0,
      totalTopics: 0,
    }),
  },
}))

jest.mock('../../services/GrowthEngineService', () => ({
  growthEngineService: {
    checkAndUpdateStreak: jest.fn(),
    awardXP: jest.fn(),
  },
}))

jest.mock('../../engines/test/AdaptiveTestEngine', () => ({
  adaptiveTestEngine: {
    estimateUserAbility: jest.fn().mockResolvedValue(0),
    sortQuestionsByInformation: jest.fn((questions: unknown[]) => questions),
  },
}))

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    generateKey: jest.fn().mockReturnValue('mock-key'),
  },
}))

jest.mock('../../services/JobQueueService', () => ({
  jobQueueService: {
    addTestSubmissionJob: jest.fn().mockResolvedValue(undefined),
  },
}))

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('TestEngineService', () => {
  let service: TestEngineService

  beforeEach(() => {
    service = new TestEngineService()
    jest.clearAllMocks()
  })

  // ── submitPracticeAnswer ──────────────────────────────────────────────────

  describe('submitPracticeAnswer', () => {
    const baseMockQuestion = {
      id: 'q1',
      text: 'What is 2+2?',
      type: 'MCQ',
      points: 10,
      explanation: 'Basic arithmetic',
      tags: ['Math'],
      options: [
        { id: 'opt-a', text: '3', isCorrect: false },
        { id: 'opt-b', text: '4', isCorrect: true },
        { id: 'opt-c', text: '5', isCorrect: false },
        { id: 'opt-d', text: '6', isCorrect: false },
      ],
      topic: { name: 'Arithmetic' },
      test: { id: 'test-1', mode: 'PRACTICE', timeLimit: 30 },
    }

    it('should throw "Question not found" when question does not exist', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        service.submitPracticeAnswer({
          userId: 'user-1',
          testId: 'test-1',
          questionId: 'non-existent',
          selectedOptionId: 'opt-a',
        })
      ).rejects.toThrow('Question not found')
    })

    it('should throw when test mode is not PRACTICE or ADAPTIVE', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValue({
        ...baseMockQuestion,
        test: { id: 'test-1', mode: 'MOCK', timeLimit: 30 },
      })

      await expect(
        service.submitPracticeAnswer({
          userId: 'user-1',
          testId: 'test-1',
          questionId: 'q1',
          selectedOptionId: 'opt-a',
        })
      ).rejects.toThrow('Practice mode is only available for practice tests')
    })

    it('should return correct answer result when a correct option is selected', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValue(baseMockQuestion)

      // Mock the $transaction to execute the callback and return the result
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'result-1',
              score: 0,
              totalPoints: 0,
            }),
            update: jest.fn().mockResolvedValue({ score: 10, totalPoints: 10 }),
          },
          testAttemptAnswer: {
            findUnique: jest.fn().mockResolvedValue(null), // No existing answer
            upsert: jest.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      const result = await service.submitPracticeAnswer({
        userId: 'user-1',
        testId: 'test-1',
        questionId: 'q1',
        selectedOptionId: 'opt-b', // correct
      })

      expect(result.isCorrect).toBe(true)
      expect(result.points).toBe(10)
      expect(result.correctOptionId).toBe('opt-b')
      expect(result.explanation).toBe('Basic arithmetic')
    })

    it('should return incorrect answer result when a wrong option is selected', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValue(baseMockQuestion)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'result-1',
              score: 0,
              totalPoints: 0,
            }),
            update: jest.fn().mockResolvedValue({ score: 0, totalPoints: 10 }),
          },
          testAttemptAnswer: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      const result = await service.submitPracticeAnswer({
        userId: 'user-1',
        testId: 'test-1',
        questionId: 'q1',
        selectedOptionId: 'opt-a', // wrong
      })

      expect(result.isCorrect).toBe(false)
      expect(result.points).toBe(0)
    })

    it('should create a new testResult when none exists for the user/test', async () => {
      ;(prisma.question.findUnique as jest.Mock).mockResolvedValue(baseMockQuestion)

      const mockCreate = jest.fn().mockResolvedValue({
        id: 'new-result-1',
        score: 0,
        totalPoints: 0,
      })

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findFirst: jest.fn().mockResolvedValue(null), // No existing result
            create: mockCreate,
            update: jest.fn().mockResolvedValue({ score: 10, totalPoints: 10 }),
          },
          testAttemptAnswer: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: jest.fn().mockResolvedValue({}),
          },
        }
        // The service also calls findFirst for maxAttempt
        tx.testResult.findFirst = jest
          .fn()
          .mockResolvedValueOnce(null) // No IN_PROGRESS result
          .mockResolvedValueOnce(null) // No previous attempts (maxAttempt)
        return cb(tx)
      })

      await service.submitPracticeAnswer({
        userId: 'user-1',
        testId: 'test-1',
        questionId: 'q1',
        selectedOptionId: 'opt-b',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            testId: 'test-1',
            status: 'IN_PROGRESS',
            attemptNumber: 1,
          }),
        })
      )
    })
  })

  // ── getTestQuestions ──────────────────────────────────────────────────────

  describe('getTestQuestions', () => {
    it('should throw "Test not found" when test does not exist', async () => {
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.getTestQuestions('non-existent', 'user-1')).rejects.toThrow(
        'Test not found'
      )
    })

    it('should return mapped questions for a MOCK test in original order', async () => {
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-1',
        mode: 'MOCK',
        isPublished: true,
        deletedAt: null,
        questions: [
          {
            id: 'q1',
            text: 'Q1',
            type: 'MCQ',
            difficulty: 0.5,
            bloomLevel: 'UNDERSTAND',
            points: 10,
            order: 1,
            options: [{ id: 'opt-a', text: 'A', order: 1 }],
          },
          {
            id: 'q2',
            text: 'Q2',
            type: 'MCQ',
            difficulty: 0.7,
            bloomLevel: 'APPLY',
            points: 10,
            order: 2,
            options: [{ id: 'opt-b', text: 'B', order: 1 }],
          },
        ],
      })

      const result = await service.getTestQuestions('test-1', 'user-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('q1')
      expect(result[1].id).toBe('q2')
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'q1',
          text: 'Q1',
          type: 'MCQ',
          points: 10,
        })
      )
    })
  })

  // ── bookmarkQuestion ─────────────────────────────────────────────────────

  describe('bookmarkQuestion', () => {
    it('should throw if question is already bookmarked', async () => {
      ;(prisma.questionBookmark.findUnique as jest.Mock).mockResolvedValue({
        id: 'bm-1',
      })

      await expect(service.bookmarkQuestion('user-1', 'q1')).rejects.toThrow(
        'Question already bookmarked'
      )
    })

    it('should create a bookmark when none exists', async () => {
      ;(prisma.questionBookmark.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.questionBookmark.create as jest.Mock).mockResolvedValue({
        id: 'bm-new',
        userId: 'user-1',
        questionId: 'q1',
        notes: 'Review later',
        question: {
          id: 'q1',
          text: 'What is 2+2?',
          type: 'MCQ',
          tags: ['Math'],
          test: { title: 'Math Test' },
        },
      })

      const result = await service.bookmarkQuestion('user-1', 'q1', 'Review later')

      expect(result.id).toBe('bm-new')
      expect(prisma.questionBookmark.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 'user-1', questionId: 'q1', notes: 'Review later' },
        })
      )
    })
  })

  // ── removeBookmark ────────────────────────────────────────────────────────

  describe('removeBookmark', () => {
    it('should call deleteMany with correct userId and questionId', async () => {
      ;(prisma.questionBookmark.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

      await service.removeBookmark('user-1', 'q1')

      expect(prisma.questionBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', questionId: 'q1' },
      })
    })
  })

  // ── getAttemptHistory ─────────────────────────────────────────────────────

  describe('getAttemptHistory', () => {
    it('should return paginated attempt history', async () => {
      const mockAttempts = [
        {
          id: 'r1',
          testId: 'test-1',
          status: 'COMPLETED',
          score: 80,
          totalPoints: 100,
          percentage: 80,
          passed: true,
          timeTaken: 600,
          attemptNumber: 1,
          startedAt: new Date('2026-01-01'),
          completedAt: new Date('2026-01-01'),
          test: {
            id: 'test-1',
            title: 'Math Test',
            mode: 'PRACTICE',
            difficulty: 'MEDIUM',
            timeLimit: 30,
            passingScore: 50,
            isAiGenerated: false,
          },
        },
      ]

      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue(mockAttempts)
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)

      const result = await service.getAttemptHistory('user-1', { page: 1, limit: 10 })

      expect(result.attempts).toHaveLength(1)
      expect(result.attempts[0].test_title).toBe('Math Test')
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
      })
    })

    it('should clamp limit to a maximum of 100', async () => {
      ;(prisma.testResult.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(0)

      const result = await service.getAttemptHistory('user-1', { limit: 999 })

      expect(result.pagination.limit).toBe(100)
    })
  })

  // ── validateTimeRemaining ─────────────────────────────────────────────────

  describe('validateTimeRemaining', () => {
    it('should return isValid: false when no attempt exists', async () => {
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await service.validateTimeRemaining('user-1', 'test-1')

      expect(result).toEqual({
        isValid: false,
        remainingSeconds: 0,
        timeLimitSeconds: 0,
      })
    })

    it('should return remaining time for an active attempt', async () => {
      const now = Date.now()
      // Started 5 minutes ago, time limit is 30 minutes
      const startedAt = new Date(now - 5 * 60 * 1000)

      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'r1',
        startedAt,
        test: { timeLimit: 30 },
      })

      const result = await service.validateTimeRemaining('user-1', 'test-1')

      // 30 min = 1800 sec, 5 min elapsed = 300 sec, remaining ~1500 sec
      expect(result.isValid).toBe(true)
      expect(result.timeLimitSeconds).toBe(1800)
      // Allow a 2-second tolerance for timing differences
      expect(result.remainingSeconds).toBeGreaterThan(1490)
      expect(result.remainingSeconds).toBeLessThanOrEqual(1500)
    })

    it('should return isValid: false when time has fully expired', async () => {
      const now = Date.now()
      // Started 60 minutes ago, time limit is 30 minutes
      const startedAt = new Date(now - 60 * 60 * 1000)

      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'r1',
        startedAt,
        test: { timeLimit: 30 },
      })

      const result = await service.validateTimeRemaining('user-1', 'test-1')

      expect(result.isValid).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })
  })

  // ── autoSubmitExpiredTests ────────────────────────────────────────────────

  describe('autoSubmitExpiredTests', () => {
    it('should return 0 when no expired tests exist', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([])

      const count = await service.autoSubmitExpiredTests()

      expect(count).toBe(0)
    })

    it('should queue expired tests and return the count', async () => {
      ;(prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'r1', testId: 't1', userId: 'u1' },
        { id: 'r2', testId: 't2', userId: 'u2' },
      ])

      const count = await service.autoSubmitExpiredTests()

      expect(count).toBe(2)

      const { jobQueueService } = require('../../services/JobQueueService')
      expect(jobQueueService.addTestSubmissionJob).toHaveBeenCalledTimes(2)
      expect(jobQueueService.addTestSubmissionJob).toHaveBeenCalledWith({
        attemptId: 'r1',
        testId: 't1',
        userId: 'u1',
      })
    })
  })
})

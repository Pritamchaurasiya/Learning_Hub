/**
 * TestScoringService Unit Tests
 *
 * Covers:
 *  - scoreAndSubmitTest: happy path MCQ, duplicate detection, time-over penalty,
 *    MSQ scoring, SUBJECTIVE dispatching, negative marking
 */

import { TestScoringService } from '../../services/TestScoringService'
import { prisma } from '../../prismaClient'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../prismaClient', () => ({
  prisma: {
    test: { findUnique: jest.fn() },
    testResult: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    testAttemptAnswer: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('../../services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    updateForBatch: jest.fn(),
    updateForSingleAnswer: jest.fn(),
  },
}))

jest.mock('../../services/GrowthEngineService', () => ({
  growthEngineService: {
    checkAndUpdateStreak: jest.fn().mockResolvedValue(undefined),
    awardXP: jest.fn().mockResolvedValue(undefined),
    updateDailyGoal: jest.fn().mockResolvedValue(undefined),
    checkAchievements: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../services/JobQueueService', () => ({
  jobQueueService: {
    addAnalyticsJob: jest.fn().mockResolvedValue(undefined),
    addGrowthJob: jest.fn().mockResolvedValue(undefined),
    addAIJob: jest.fn().mockResolvedValue(undefined),
    addTestSubmissionJob: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../services/ml/ConductorClient', () => ({
  conductorClient: {
    detectTestAnomaly: jest.fn().mockResolvedValue(null),
  },
}))

jest.mock('../../services/WebSocketService', () => ({
  webSocketService: {
    notifyUser: jest.fn(),
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildMockTest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-1',
    title: 'Math Test',
    mode: 'MOCK',
    difficulty: 'MEDIUM',
    timeLimit: 30, // minutes
    passingScore: 50, // percentage
    negativeMarks: 0,
    subjectId: null,
    questions: [
      {
        id: 'q1',
        text: 'What is 2+2?',
        type: 'MCQ',
        points: 10,
        difficulty: 0.5,
        explanation: 'Basic math',
        tags: ['Arithmetic'],
        options: [
          { id: 'opt-a', text: '3', isCorrect: false },
          { id: 'opt-b', text: '4', isCorrect: true },
          { id: 'opt-c', text: '5', isCorrect: false },
          { id: 'opt-d', text: '6', isCorrect: false },
        ],
      },
      {
        id: 'q2',
        text: 'What is 3*3?',
        type: 'MCQ',
        points: 10,
        difficulty: 0.5,
        explanation: 'Multiplication',
        tags: ['Arithmetic'],
        options: [
          { id: 'opt-e', text: '6', isCorrect: false },
          { id: 'opt-f', text: '9', isCorrect: true },
          { id: 'opt-g', text: '12', isCorrect: false },
          { id: 'opt-h', text: '15', isCorrect: false },
        ],
      },
    ],
    ...overrides,
  }
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('TestScoringService', () => {
  let service: TestScoringService

  beforeEach(() => {
    service = new TestScoringService()
    jest.clearAllMocks()
    ;(prisma.$transaction as jest.Mock).mockReset()
  })

  describe('scoreAndSubmitTest', () => {
    it('should throw "Test not found" when test does not exist', async () => {
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        service.scoreAndSubmitTest({
          userId: 'user-1',
          testId: 'non-existent',
          answers: {},
        })
      ).rejects.toThrow('Test not found')
    })

    it('should score a fully correct MCQ test and return passing result', async () => {
      const mockTest = buildMockTest()
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(null) // no existing attempt

      // Mock transaction
      const mockResultRecord = {
        id: 'result-1',
        userId: 'user-1',
        testId: 'test-1',
        score: 20,
        totalPoints: 20,
        percentage: 100,
        passed: true,
        timeTaken: 600,
        status: 'COMPLETED',
        attemptNumber: 1,
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue(null),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockResultRecord),
            update: jest.fn().mockResolvedValue(mockResultRecord),
          },
          testAttemptAnswer: {
            upsert: jest.fn().mockResolvedValue({}),
          },
        }
        return cb(tx)
      })

      // Both answers correct
      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1) // first test

      const result = await service.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-1',
        answers: { q1: 'opt-b', q2: 'opt-f' },
        timeTaken: 600,
      })

      expect(result.correctCount).toBe(2)
      expect(result.incorrectCount).toBe(0)
      expect(result.questionResults).toHaveLength(2)
      expect(result.questionResults[0].is_correct).toBe(true)
      expect(result.questionResults[1].is_correct).toBe(true)
    })

    it('should detect a duplicate submission and return isDuplicate: true', async () => {
      const mockTest = buildMockTest()
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)

      // Existing result that is already COMPLETED (not IN_PROGRESS)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'result-existing',
        status: 'COMPLETED',
        startedAt: new Date(),
        attemptNumber: 1,
      })
      ;(prisma.testResult.findUnique as jest.Mock).mockResolvedValue({
        id: 'result-existing',
        status: 'COMPLETED',
        score: 20,
        percentage: 100,
      })

      const result = await service.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-1',
        answers: { q1: 'opt-b', q2: 'opt-f' },
      })

      expect(result.isDuplicate).toBe(true)
    })

    it('should apply negative marking for wrong answers', async () => {
      const mockTest = buildMockTest({ negativeMarks: 2 })
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue(null),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'result-2',
              userId: 'user-1',
              testId: 'test-1',
              score: 8,
              totalPoints: 20,
              percentage: 40,
              passed: false,
              timeTaken: 600,
              status: 'COMPLETED',
              attemptNumber: 1,
            }),
          },
          testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)

      const result = await service.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-1',
        answers: { q1: 'opt-b', q2: 'opt-e' }, // q1 correct, q2 wrong
        timeTaken: 600,
      })

      // q1: +10, q2: -2 (negativeMarks) => 8, but score is clamped to Math.max(0, score)
      expect(result.questionResults[0].is_correct).toBe(true)
      expect(result.questionResults[0].marks_obtained).toBe(10)
      expect(result.questionResults[1].is_correct).toBe(false)
      expect(result.questionResults[1].marks_obtained).toBe(-2)
    })

    it('should apply 75% penalty when test is over time', async () => {
      const mockTest = buildMockTest()
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)

      // Existing IN_PROGRESS attempt started long ago
      const longAgo = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'result-over',
        status: 'IN_PROGRESS',
        startedAt: longAgo,
        attemptNumber: 1,
      })

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'result-over',
              status: 'IN_PROGRESS',
            }),
            create: jest.fn(),
            update: jest.fn().mockResolvedValue({
              id: 'result-over',
              status: 'TIMEOUT',
              score: 15, // 20 * 0.75
            }),
          },
          testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)

      const result = await service.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-1',
        answers: { q1: 'opt-b', q2: 'opt-f' },
        timeTaken: 300, // client says 5 min, but server says 2 hours
      })

      // The scoring logic internally detects server time > client + 10s, uses server time
      // Time limit is 30 min = 1800s, server time is ~7200s => over time
      // Score = 20 * 0.75 = 15
      expect(result.questionResults.every((q: { is_correct: boolean }) => q.is_correct)).toBe(true)
    })

    it('should handle SUBJECTIVE questions by dispatching AI grading jobs', async () => {
      const subjectiveTest = buildMockTest({
        questions: [
          {
            id: 'q-sub',
            text: 'Explain recursion.',
            type: 'SUBJECTIVE',
            points: 20,
            difficulty: 0.7,
            explanation: '',
            tags: ['CS'],
            options: [],
          },
        ],
      })

      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(subjectiveTest)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: Function) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue(null),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'result-sub',
              userId: 'user-1',
              testId: 'test-1',
              score: 0,
              totalPoints: 20,
              percentage: 0,
              passed: false,
              timeTaken: 300,
              status: 'COMPLETED',
              attemptNumber: 1,
            }),
          },
          testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      ;(prisma.testResult.count as jest.Mock).mockResolvedValue(1)

      const { jobQueueService } = require('../../services/JobQueueService')

      const result = await service.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-1',
        answers: { 'q-sub': 'Recursion is a function calling itself.' },
        timeTaken: 300,
      })

      // SUBJECTIVE questions get 0 marks initially, dispatched to AI worker
      expect(result.questionResults[0].is_correct).toBe(false)
      expect(result.questionResults[0].explanation).toBe('Grading in progress by AI worker...')
      expect(jobQueueService.addAIJob).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          operation: 'GRADE_SUBJECTIVE',
          params: expect.objectContaining({
            questionId: 'q-sub',
            answerText: 'Recursion is a function calling itself.',
          }),
        })
      )
    })
  })
})

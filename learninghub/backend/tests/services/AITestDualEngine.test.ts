import { aiTestService } from '../../src/services/AITestService'
import { testScoringService } from '../../src/services/TestScoringService'
import { prisma } from '../../src/prismaClient'

// Mock prisma
jest.mock('../../src/prismaClient', () => ({
  prisma: {
    question: {
      findMany: jest.fn(),
    },
    test: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    testResult: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    testAttemptAnswer: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    topicPerformance: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(prisma)),
  },
}))

// Mock CacheService
jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve(true)),
    delete: jest.fn(() => Promise.resolve(true)),
  },
}))

// Mock JobQueueService
jest.mock('../../src/services/JobQueueService', () => ({
  jobQueueService: {
    addAIJob: jest.fn().mockResolvedValue(undefined),
    addAnalyticsJob: jest.fn().mockResolvedValue(undefined),
    addGrowthJob: jest.fn().mockResolvedValue(undefined),
    addTestSubmissionJob: jest.fn().mockResolvedValue(undefined),
  },
}))

// Mock WebSocketService
jest.mock('../../src/services/WebSocketService', () => ({
  webSocketService: {
    notifyUser: jest.fn(),
  },
}))

describe('Tests A+ Dual Engine Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Suite A: NO_AI Native Engine (Deterministic Question Bank)', () => {
    it('should generate test directly from Question Bank without triggering AI agent when mode is NO_AI', async () => {
      const mockQuestions = [
        {
          id: 'q-bank-1',
          text: 'What is O(1) time complexity?',
          type: 'MCQ',
          difficulty: 0.2,
          bloomLevel: 'UNDERSTAND',
          explanation: 'Constant time complexity.',
          tags: ['algorithms'],
          points: 10,
          options: [
            { id: 'opt-1', text: 'Constant time', isCorrect: true, order: 0 },
            { id: 'opt-2', text: 'Linear time', isCorrect: false, order: 1 },
          ],
        },
      ]

      ;(prisma.question.findMany as jest.Mock).mockResolvedValueOnce(mockQuestions)
      ;(prisma.test.create as jest.Mock).mockResolvedValueOnce({
        id: 'test-bank-1',
        title: 'Practice: algorithms',
        questions: mockQuestions,
      })

      const result = await aiTestService.generateTest({
        userId: 'test-user-1',
        topic: 'algorithms',
        difficulty: 'EASY',
        count: 1,
        mode: 'PRACTICE',
        aiMode: 'NO_AI',
      })

      expect(result.ai_powered).toBe(false)
      expect(result.model).toBe('question-bank')
      expect(result.questions.length).toBe(1)
      expect(result.questions[0].text).toBe('What is O(1) time complexity?')
      expect(prisma.question.findMany).toHaveBeenCalled()
    })

    it('should cleanly throw AI_SERVICE_UNAVAILABLE when AI fails and mode is AI_REQUIRED', async () => {
      const mockReq = {
        userId: 'test-user-1',
        topic: 'quantum computing',
        difficulty: 'HARD' as const,
        count: 5,
        mode: 'MOCK' as const,
        aiMode: 'AI_REQUIRED' as const,
      }

      await expect(aiTestService.generateTest(mockReq)).rejects.toThrow('AI_SERVICE_UNAVAILABLE')
    })
  })

  describe('Suite B: Deterministic Multi-Type Scoring Engine', () => {
    it('should deterministically score Numerical answers with 1% tolerance', async () => {
      const mockTest = {
        id: 'test-numerical',
        totalMarks: 10,
        timeLimit: 30,
        passingScore: 50,
        negativeMarks: 1,
        questions: [
          {
            id: 'q-num-1',
            type: 'NUMERICAL',
            points: 10,
            options: [{ id: 'opt-num-1', text: '9.81', isCorrect: true }],
          },
        ],
      }

      const mockAttempt = {
        id: 'res-num-1',
        userId: 'user-1',
        testId: 'test-numerical',
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 60000),
      }

      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(mockAttempt)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue(mockAttempt),
            update: jest.fn().mockImplementation(({ data }: any) => ({
              ...mockAttempt,
              ...data,
            })),
          },
          testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      const output = await testScoringService.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-numerical',
        answers: { 'q-num-1': '9.85' },
        timeTaken: 60,
        attemptId: 'res-num-1',
      })

      expect(output.correctCount).toBe(1)
      expect(output.result.score).toBe(10)
      expect(output.result.passed).toBe(true)
    })

    it('should deterministically score Short Answer questions with normalized string matching', async () => {
      const mockTest = {
        id: 'test-sa',
        totalMarks: 10,
        timeLimit: 30,
        passingScore: 50,
        negativeMarks: 0,
        questions: [
          {
            id: 'q-sa-1',
            type: 'SHORT_ANSWER',
            points: 10,
            options: [{ id: 'opt-sa-1', text: 'Mitochondria', isCorrect: true }],
          },
        ],
      }

      const mockAttempt = {
        id: 'res-sa-1',
        userId: 'user-1',
        testId: 'test-sa',
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 60000),
      }

      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(mockAttempt)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue(mockAttempt),
            update: jest.fn().mockImplementation(({ data }: any) => ({
              ...mockAttempt,
              ...data,
            })),
          },
          testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      const output = await testScoringService.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-sa',
        answers: { 'q-sa-1': '   mitochondria   ' },
        timeTaken: 60,
        attemptId: 'res-sa-1',
      })

      expect(output.correctCount).toBe(1)
      expect(output.result.score).toBe(10)
    })

    it('should grade Subjective questions with isPendingSubjective = true and not block objective score calculation', async () => {
      const mockTest = {
        id: 'test-subj',
        totalMarks: 20,
        timeLimit: 30,
        passingScore: 50,
        negativeMarks: 0,
        questions: [
          {
            id: 'q-mcq-1',
            type: 'MCQ',
            points: 10,
            options: [
              { id: 'opt-1', text: 'Correct A', isCorrect: true },
              { id: 'opt-2', text: 'Wrong B', isCorrect: false },
            ],
          },
          {
            id: 'q-subj-1',
            type: 'SUBJECTIVE',
            points: 10,
            options: [],
          },
        ],
      }

      const mockAttempt = {
        id: 'res-subj-1',
        userId: 'user-1',
        testId: 'test-subj',
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 60000),
      }

      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
      ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(mockAttempt)
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          testResult: {
            findUnique: jest.fn().mockResolvedValue(mockAttempt),
            update: jest.fn().mockImplementation(({ data }: any) => ({
              ...mockAttempt,
              ...data,
            })),
          },
          testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
        }
        return cb(tx)
      })

      const output = await testScoringService.scoreAndSubmitTest({
        userId: 'user-1',
        testId: 'test-subj',
        answers: {
          'q-mcq-1': 'opt-1',
          'q-subj-1': 'Detailed system design explanation...',
        },
        timeTaken: 120,
        attemptId: 'res-subj-1',
      })

      expect(output.correctCount).toBe(1)
      expect(output.result.score).toBe(10)
      expect(
        output.questionResults.find((qr: any) => qr.question_id === 'q-subj-1')?.is_correct
      ).toBeNull()
    })
  })
})

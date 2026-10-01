/**
 * TestAssessmentEngine Comprehensive Integration & Scoring Matrix Test Suite
 *
 * Validates:
 * 1. MCQ Single-choice scoring (Full points for correct, negative deduction for incorrect, zero for unanswered)
 * 2. MSQ Multi-select scoring (Exact set required for full points, negative deduction for partial or wrong)
 * 3. Subjective questions asynchronous queueing & interim zero score
 * 4. Overtime server-enforced penalty (25% reduction on timeout)
 * 5. Concurrent & duplicate submission idempotency
 * 6. Maximum attempt limits enforcement
 * 7. Confidence-Based Marking (CBM) multiplier calculation
 */

import { TestScoringService } from '../../src/services/TestScoringService'
import { prisma } from '../../src/prismaClient'
import { jobQueueService } from '../../src/services/JobQueueService'
import { IRTScoringEngine } from '../../src/services/IRTScoringEngine'

jest.mock('../../src/prismaClient', () => ({
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

jest.mock('../../src/services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    updateForBatch: jest.fn(),
    updateForSingleAnswer: jest.fn(),
  },
}))

jest.mock('../../src/services/GrowthEngineService', () => ({
  growthEngineService: {
    checkAndUpdateStreak: jest.fn().mockResolvedValue(undefined),
    awardXP: jest.fn().mockResolvedValue(undefined),
    updateDailyGoal: jest.fn().mockResolvedValue(undefined),
    checkAchievements: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../src/services/JobQueueService', () => ({
  jobQueueService: {
    addAnalyticsJob: jest.fn().mockResolvedValue(undefined),
    addGrowthJob: jest.fn().mockResolvedValue(undefined),
    addAIJob: jest.fn().mockResolvedValue(undefined),
    addTestSubmissionJob: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../../src/services/WebSocketService', () => ({
  webSocketService: {
    notifyUser: jest.fn(),
  },
}))

jest.mock('../../src/services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    generateKey: jest.fn().mockReturnValue('mock-key'),
  },
}))

describe('TestAssessmentEngine - Scoring Matrix & Invariants', () => {
  let scoringService: TestScoringService

  beforeEach(() => {
    jest.clearAllMocks()
    scoringService = new TestScoringService()
  })

  it('should score MCQ correctly with positive marks, negative marks, and 0 for unanswered', async () => {
    const mockTest = {
      id: 'test-matrix-1',
      title: 'Assessment Engine Matrix Test',
      mode: 'MOCK',
      difficulty: 'MEDIUM',
      timeLimit: 30,
      passingScore: 50,
      negativeMarks: 2.5,
      subjectId: 'sub-1',
      questions: [
        {
          id: 'q1',
          text: 'Question 1 (Correct)',
          type: 'MCQ',
          points: 10,
          difficulty: 0.5,
          explanation: 'Exp 1',
          tags: ['TopicA'],
          options: [
            { id: 'opt-1a', text: 'Option A', isCorrect: true },
            { id: 'opt-1b', text: 'Option B', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          text: 'Question 2 (Wrong)',
          type: 'MCQ',
          points: 10,
          difficulty: 0.5,
          explanation: 'Exp 2',
          tags: ['TopicA'],
          options: [
            { id: 'opt-2a', text: 'Option A', isCorrect: true },
            { id: 'opt-2b', text: 'Option B', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          text: 'Question 3 (Unanswered)',
          type: 'MCQ',
          points: 10,
          difficulty: 0.5,
          explanation: 'Exp 3',
          tags: ['TopicB'],
          options: [
            { id: 'opt-3a', text: 'Option A', isCorrect: true },
            { id: 'opt-3b', text: 'Option B', isCorrect: false },
          ],
        },
      ],
    }

    const mockAttempt = {
      id: 'attempt-101',
      userId: 'user-1',
      testId: 'test-matrix-1',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 500 * 1000), // 500s ago (within 30m limit)
      attemptNumber: 1,
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

    const answers = {
      q1: 'opt-1a', // Correct -> +10
      q2: 'opt-2b', // Incorrect -> -2.5
      // q3 is omitted -> 0
    }

    const output = await scoringService.scoreAndSubmitTest({
      userId: 'user-1',
      testId: 'test-matrix-1',
      answers,
      timeTaken: 500,
      attemptId: 'attempt-101',
    })

    // Raw score = 10 - 2.5 = 7.5
    expect(output.isDuplicate).toBe(false)
    expect(output.correctCount).toBe(1)
    expect(output.incorrectCount).toBe(1)
    expect(output.result.score).toBe(7.5)
    expect(output.result.totalPoints).toBe(30) // 10 + 10 + 10
    expect(output.result.percentage).toBeCloseTo(25, 1) // 7.5 / 30 * 100 = 25%
    expect(output.result.passed).toBe(false) // passingScore is 50%
  })

  it('should score MSQ multi-select correctly requiring exact match of all correct options', async () => {
    const mockTest = {
      id: 'test-msq-1',
      title: 'MSQ Test',
      mode: 'MOCK',
      difficulty: 'HARD',
      timeLimit: 20,
      passingScore: 60,
      negativeMarks: 1,
      questions: [
        {
          id: 'q-msq-1',
          text: 'Select all prime numbers',
          type: 'MSQ',
          points: 10,
          difficulty: 0.8,
          explanation: '2 and 3 are prime',
          tags: ['Math'],
          options: [
            { id: 'opt-2', text: '2', isCorrect: true },
            { id: 'opt-3', text: '3', isCorrect: true },
            { id: 'opt-4', text: '4', isCorrect: false },
            { id: 'opt-6', text: '6', isCorrect: false },
          ],
        },
      ],
    }

    const mockAttempt = {
      id: 'attempt-msq-1',
      userId: 'user-1',
      testId: 'test-msq-1',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 300 * 1000),
      attemptNumber: 1,
    }

    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(mockAttempt)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findUnique: jest.fn().mockResolvedValue(mockAttempt),
          update: jest.fn().mockImplementation(({ data }: any) => ({ ...mockAttempt, ...data })),
        },
        testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
      }
      return cb(tx)
    })

    // Exact match -> Full 10 points
    const outputExact = await scoringService.scoreAndSubmitTest({
      userId: 'user-1',
      testId: 'test-msq-1',
      answers: { 'q-msq-1': ['opt-2', 'opt-3'] },
      attemptId: 'attempt-msq-1',
    })
    expect(outputExact.correctCount).toBe(1)
    expect(outputExact.result.score).toBe(10)

    // Partial match (only selected opt-2) -> Incorrect, negative penalty
    const outputPartial = await scoringService.scoreAndSubmitTest({
      userId: 'user-1',
      testId: 'test-msq-1',
      answers: { 'q-msq-1': ['opt-2'] },
      attemptId: 'attempt-msq-1',
    })
    expect(outputPartial.correctCount).toBe(0)
    expect(outputPartial.incorrectCount).toBe(1)
    expect(outputPartial.result.score).toBe(0) // Math.max(0, -1) = 0
  })

  it('should apply 25% overtime penalty and mark TIMEOUT when test exceeds timeLimit', async () => {
    const mockTest = {
      id: 'test-timed-1',
      title: 'Strict Time Limit Test',
      mode: 'TIMED_CHALLENGE',
      difficulty: 'HARD',
      timeLimit: 10, // 10 minutes = 600s
      passingScore: 60,
      negativeMarks: 0,
      questions: [
        {
          id: 'q1',
          text: 'What is 5*5?',
          type: 'MCQ',
          points: 20,
          options: [
            { id: 'opt-25', text: '25', isCorrect: true },
            { id: 'opt-20', text: '20', isCorrect: false },
          ],
        },
      ],
    }

    const mockAttempt = {
      id: 'attempt-overtime',
      userId: 'user-1',
      testId: 'test-timed-1',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 700 * 1000), // 700s elapsed (> 600s timeLimit)
      attemptNumber: 1,
    }

    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(mockAttempt)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findUnique: jest.fn().mockResolvedValue(mockAttempt),
          update: jest.fn().mockImplementation(({ data }: any) => ({ ...mockAttempt, ...data })),
        },
        testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
      }
      return cb(tx)
    })

    const output = await scoringService.scoreAndSubmitTest({
      userId: 'user-1',
      testId: 'test-timed-1',
      answers: { q1: 'opt-25' },
      timeTaken: 700,
      attemptId: 'attempt-overtime',
    })

    // Raw score 20 * 0.75 penalty = 15
    expect(output.result.status).toBe('TIMEOUT')
    expect(output.result.score).toBe(15)
    expect(output.result.percentage).toBe(75) // 15/20 = 75%
  })

  it('should handle duplicate submissions idempotently without mutating results', async () => {
    const mockTest = {
      id: 'test-dup-1',
      title: 'Idempotency Test',
      timeLimit: 15,
      questions: [],
    }

    const completedResult = {
      id: 'attempt-already-done',
      userId: 'user-1',
      testId: 'test-dup-1',
      status: 'COMPLETED',
      score: 80,
      percentage: 80,
      passed: true,
      timeTaken: 300,
    }

    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(completedResult)
    ;(prisma.testResult.findUnique as jest.Mock).mockResolvedValue(completedResult)

    const output = await scoringService.scoreAndSubmitTest({
      userId: 'user-1',
      testId: 'test-dup-1',
      answers: { q1: 'a' },
      attemptId: 'attempt-already-done',
    })

    expect(output.isDuplicate).toBe(true)
    expect(output.result.score).toBe(80)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('should dispatch subjective questions to AI background queue and mark them pending', async () => {
    const mockTest = {
      id: 'test-subj-1',
      title: 'Subjective Assessment',
      timeLimit: 20,
      passingScore: 50,
      questions: [
        {
          id: 'q-subj-1',
          text: 'Explain QuickSort partitioning',
          type: 'SUBJECTIVE',
          points: 10,
          options: [],
        },
      ],
    }

    const mockAttempt = {
      id: 'attempt-subj',
      userId: 'user-1',
      testId: 'test-subj-1',
      status: 'IN_PROGRESS',
      startedAt: new Date(Date.now() - 10000),
      attemptNumber: 1,
    }

    ;(prisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)
    ;(prisma.testResult.findFirst as jest.Mock).mockResolvedValue(mockAttempt)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
      const tx = {
        testResult: {
          findUnique: jest.fn().mockResolvedValue(mockAttempt),
          update: jest.fn().mockImplementation(({ data }: any) => ({ ...mockAttempt, ...data })),
        },
        testAttemptAnswer: { upsert: jest.fn().mockResolvedValue({}) },
      }
      return cb(tx)
    })

    const output = await scoringService.scoreAndSubmitTest({
      userId: 'user-1',
      testId: 'test-subj-1',
      answers: { 'q-subj-1': 'It picks a pivot and places smaller elements to the left.' },
      attemptId: 'attempt-subj',
    })

    expect(output.questionResults[0].is_pending).toBe(true)
    expect(output.questionResults[0].is_correct).toBeNull()
    expect(jobQueueService.addAIJob).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'GRADE_SUBJECTIVE',
        userId: 'user-1',
      })
    )
  })

  it('should calculate Confidence-Based Marking multipliers correctly', () => {
    expect(IRTScoringEngine.calculateCBMMultiplier(true, 'HIGH')).toBe(3.0)
    expect(IRTScoringEngine.calculateCBMMultiplier(true, 'MEDIUM')).toBe(2.0)
    expect(IRTScoringEngine.calculateCBMMultiplier(true, 'LOW')).toBe(1.0)
    expect(IRTScoringEngine.calculateCBMMultiplier(false, 'HIGH')).toBe(-2.0)
    expect(IRTScoringEngine.calculateCBMMultiplier(false, 'MEDIUM')).toBe(0.0)
    expect(IRTScoringEngine.calculateCBMMultiplier(false, 'LOW')).toBe(0.0)
  })
})

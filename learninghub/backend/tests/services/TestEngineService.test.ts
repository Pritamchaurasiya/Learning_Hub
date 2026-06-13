import { TestEngineService } from '../../src/services/TestEngineService'
import { prisma } from '../../src/prismaClient'

const mockPrisma = prisma as any

// Mock logger
jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn(),
  }
  return {
    ...mockLogger,
    default: mockLogger,
  }
})

jest.mock('../../src/services/TopicPerformanceService', () => ({
  topicPerformanceService: {
    updateForSingleAnswer: jest.fn().mockResolvedValue(true),
    getTopicMasteryMap: jest.fn().mockResolvedValue({
      userId: 'user-1',
      totalAttempts: 10,
      globalAccuracy: 75,
      topics: [],
    }),
  },
}))

jest.mock('../../src/services/GrowthEngineService', () => ({
  growthEngineService: {
    awardXP: jest.fn().mockResolvedValue(true),
  },
}))

describe('TestEngineService', () => {
  let service: TestEngineService

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockPrisma.$transaction as jest.Mock) = jest.fn(async (callback) => {
      return callback(mockPrisma)
    })
    service = new TestEngineService()
  })

  describe('submitPracticeAnswer', () => {
    const mockRequest = {
      userId: 'user-1',
      testId: 'test-1',
      questionId: 'question-1',
      selectedOptionId: 'option-correct',
    }

    const mockQuestion = {
      id: 'question-1',
      text: 'What is 2+2?',
      type: 'MULTIPLE_CHOICE',
      points: 10,
      explanation: 'Basic arithmetic',
      tags: ['math', 'arithmetic'],
      test: {
        id: 'test-1',
        mode: 'PRACTICE',
        timeLimit: 60,
      },
      options: [
        { id: 'option-correct', text: '4', isCorrect: true },
        { id: 'option-wrong', text: '5', isCorrect: false },
      ],
    }

    it('should submit correct answer and return feedback', async () => {
      ;(mockPrisma.question.findUnique as jest.Mock).mockResolvedValue(mockQuestion)
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.testResult.create as jest.Mock).mockResolvedValue({
        id: 'result-1',
        userId: mockRequest.userId,
        testId: mockRequest.testId,
        score: 0,
        answers: {},
        questionResults: [],
        attemptNumber: 1,
      })
      ;(mockPrisma.testResult.update as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.topicPerformance.upsert as jest.Mock).mockResolvedValue({})

      const result = await service.submitPracticeAnswer(mockRequest)

      expect(result.isCorrect).toBe(true)
      expect(result.points).toBe(10)
      expect(result.explanation).toBe('Basic arithmetic')
      expect(result.correctOptionId).toBe('option-correct')
      expect(mockPrisma.testResult.update).toHaveBeenCalled()
    })

    it('should submit incorrect answer and return feedback', async () => {
      const wrongRequest = { ...mockRequest, selectedOptionId: 'option-wrong' }

      ;(mockPrisma.question.findUnique as jest.Mock).mockResolvedValue(mockQuestion)
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.testResult.create as jest.Mock).mockResolvedValue({
        id: 'result-1',
        userId: mockRequest.userId,
        testId: mockRequest.testId,
        score: 0,
        answers: {},
        questionResults: [],
        attemptNumber: 1,
      })
      ;(mockPrisma.testResult.update as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.topicPerformance.upsert as jest.Mock).mockResolvedValue({})

      const result = await service.submitPracticeAnswer(wrongRequest)

      expect(result.isCorrect).toBe(false)
      expect(result.points).toBe(0)
      expect(result.correctOptionId).toBe('option-correct')
    })

    it('should throw error for non-existent question', async () => {
      ;(mockPrisma.question.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.submitPracticeAnswer(mockRequest)).rejects.toThrow(
        'Question not found'
      )
    })

    it('should throw error for non-practice mode', async () => {
      const mockTimedQuestion = {
        ...mockQuestion,
        test: { ...mockQuestion.test, mode: 'TIMED' },
      }
      ;(mockPrisma.question.findUnique as jest.Mock).mockResolvedValue(mockTimedQuestion)

      await expect(service.submitPracticeAnswer(mockRequest)).rejects.toThrow(
        'Practice mode is only available for practice tests'
      )
    })

    it('should update existing practice result', async () => {
      const existingResult = {
        id: 'result-1',
        userId: mockRequest.userId,
        testId: mockRequest.testId,
        score: 10,
        answers: { 'question-0': 'option-0' },
        questionResults: [{ question_id: 'question-0', is_correct: true, marks_obtained: 10 }],
        attemptNumber: 1,
      }

      ;(mockPrisma.question.findUnique as jest.Mock).mockResolvedValue(mockQuestion)
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue(existingResult)
      ;(mockPrisma.testResult.update as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.topicPerformance.upsert as jest.Mock).mockResolvedValue({})

      const result = await service.submitPracticeAnswer(mockRequest)

      expect(result.isCorrect).toBe(true)
      expect(mockPrisma.testResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'result-1' },
          data: expect.objectContaining({
            score: 20, // 10 from previous + 10 from current
          }),
        })
      )
    })

    it('should update topic performance', async () => {
      ;(mockPrisma.question.findUnique as jest.Mock).mockResolvedValue(mockQuestion)
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.testResult.create as jest.Mock).mockResolvedValue({
        id: 'result-1',
        userId: mockRequest.userId,
        testId: mockRequest.testId,
        score: 0,
        answers: {},
        questionResults: [],
        attemptNumber: 1,
      })
      ;(mockPrisma.testResult.update as jest.Mock).mockResolvedValue({})
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.topicPerformance.upsert as jest.Mock).mockResolvedValue({})

      await service.submitPracticeAnswer(mockRequest)

      // Should update performance for the primary tag via the service
      const { topicPerformanceService } = require('../../src/services/TopicPerformanceService')
      expect(topicPerformanceService.updateForSingleAnswer).toHaveBeenCalledWith(
        mockRequest.userId,
        'math',
        true,
        expect.any(Object)
      )
    })
  })

  describe('getTestQuestions', () => {
    const mockTest = {
      id: 'test-1',
      title: 'Math Test',
      mode: 'PRACTICE',
      isPublished: true,
      questions: [
        {
          id: 'q1',
          text: 'Question 1',
          type: 'MULTIPLE_CHOICE',
          difficulty: 'EASY',
          bloomLevel: 'REMEMBER',
          points: 10,
          order: 1,
          options: [
            { id: 'opt1', text: 'Option 1', order: 1 },
            { id: 'opt2', text: 'Option 2', order: 2 },
          ],
        },
        {
          id: 'q2',
          text: 'Question 2',
          type: 'MULTIPLE_CHOICE',
          difficulty: 'MEDIUM',
          bloomLevel: 'UNDERSTAND',
          points: 15,
          order: 2,
          options: [
            { id: 'opt3', text: 'Option 3', order: 1 },
            { id: 'opt4', text: 'Option 4', order: 2 },
          ],
        },
      ],
    }

    it('should return test questions for practice mode', async () => {
      ;(mockPrisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)

      const result = await service.getTestQuestions('test-1', 'user-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('text')
      expect(result[0]).toHaveProperty('options')
      expect(result[0].options).toHaveLength(2)
      // Practice mode shuffles questions, so we just check they exist
      expect(result.map(q => q.id).sort()).toEqual(['q1', 'q2'])
    })

    it('should return questions in order for timed mode', async () => {
      const timedTest = { ...mockTest, mode: 'TIMED' }
      ;(mockPrisma.test.findUnique as jest.Mock).mockResolvedValue(timedTest)

      const result = await service.getTestQuestions('test-1', 'user-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('q1')
      expect(result[1].id).toBe('q2')
    })

    it('should throw error for non-existent test', async () => {
      ;(mockPrisma.test.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.getTestQuestions('non-existent', 'user-1')).rejects.toThrow(
        'Test not found'
      )
    })

    it('should not include correct answers in options', async () => {
      ;(mockPrisma.test.findUnique as jest.Mock).mockResolvedValue(mockTest)

      const result = await service.getTestQuestions('test-1', 'user-1')

      result.forEach(question => {
        question.options.forEach((option: any) => {
          expect(option).not.toHaveProperty('isCorrect')
        })
      })
    })
  })

  describe('getTestAnalytics', () => {
    const mockResults = [
      {
        id: 'result-1',
        userId: 'user-1',
        testId: 'test-1',
        score: 80,
        percentage: 80,
        passed: true,
        status: 'COMPLETED',
        completedAt: new Date('2024-01-01'),
        questionResults: [
          { question_id: 'q1', is_correct: true, marks_obtained: 10 },
          { question_id: 'q2', is_correct: false, marks_obtained: 0 },
        ],
        test: {
          id: 'test-1',
          title: 'Math Test',
          mode: 'TIMED',
          difficulty: 'EASY',
          isAiGenerated: false,
        },
      },
      {
        id: 'result-2',
        userId: 'user-1',
        testId: 'test-2',
        score: 60,
        percentage: 60,
        passed: true,
        status: 'COMPLETED',
        completedAt: new Date('2024-01-02'),
        questionResults: [
          { question_id: 'q3', is_correct: true, marks_obtained: 15 },
        ],
        test: {
          id: 'test-2',
          title: 'Science Test',
          mode: 'PRACTICE',
          difficulty: 'MEDIUM',
          isAiGenerated: true,
        },
      },
    ]

    it('should return comprehensive analytics', async () => {
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(mockResults)
      ;(mockPrisma.question.findMany as jest.Mock).mockResolvedValue([
        { id: 'q1', tags: ['math'] },
        { id: 'q2', tags: ['math', 'algebra'] },
        { id: 'q3', tags: ['science'] },
      ])

      const result = await service.getTestAnalytics('user-1')

      expect(result.total_tests).toBe(2)
      expect(result.passed_tests).toBe(2)
      expect(result.pass_rate).toBe(100)
      expect(result.average_score).toBe(70) // (80 + 60) / 2
      expect(result.by_difficulty).toHaveProperty('EASY')
      expect(result.by_difficulty).toHaveProperty('MEDIUM')
      expect(result.trend).toHaveLength(2)
      expect(result.topic_performance).toBeDefined()
    })

    it('should handle no test results', async () => {
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.question.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getTestAnalytics('user-1')

      expect(result.total_tests).toBe(0)
      expect(result.passed_tests).toBe(0)
      expect(result.pass_rate).toBe(0)
      expect(result.average_score).toBe(0)
    })

    it('should calculate performance by difficulty correctly', async () => {
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(mockResults)
      ;(mockPrisma.question.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getTestAnalytics('user-1')

      expect(result.by_difficulty.EASY.total).toBe(1)
      expect(result.by_difficulty.EASY.passed).toBe(1)
      expect(result.by_difficulty.EASY.avgScore).toBe(80)
      expect(result.by_difficulty.MEDIUM.total).toBe(1)
      expect(result.by_difficulty.MEDIUM.passed).toBe(1)
      expect(result.by_difficulty.MEDIUM.avgScore).toBe(60)
    })
  })

  describe('bookmarkQuestion', () => {
    it('should bookmark a question successfully', async () => {
      ;(mockPrisma.questionBookmark.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.questionBookmark.create as jest.Mock).mockResolvedValue({
        id: 'bookmark-1',
        userId: 'user-1',
        questionId: 'question-1',
        notes: 'Review later',
        question: {
          id: 'question-1',
          text: 'What is 2+2?',
          type: 'MULTIPLE_CHOICE',
          tags: ['math'],
          test: { title: 'Math Test' },
        },
      })

      const result = await service.bookmarkQuestion('user-1', 'question-1', 'Review later')

      expect(result.userId).toBe('user-1')
      expect(result.questionId).toBe('question-1')
      expect(mockPrisma.questionBookmark.create).toHaveBeenCalled()
    })

    it('should throw error for duplicate bookmark', async () => {
      ;(mockPrisma.questionBookmark.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-bookmark',
      })

      await expect(service.bookmarkQuestion('user-1', 'question-1')).rejects.toThrow(
        'Question already bookmarked'
      )
    })
  })

  describe('getBookmarkedQuestions', () => {
    it('should return bookmarked questions', async () => {
      const mockBookmarks = [
        {
          id: 'bookmark-1',
          userId: 'user-1',
          questionId: 'question-1',
          notes: 'Review',
          createdAt: new Date(),
          question: {
            id: 'question-1',
            text: 'Question 1',
            type: 'MULTIPLE_CHOICE',
            tags: ['math'],
            difficulty: 'EASY',
            test: { title: 'Math Test', id: 'test-1' },
          },
        },
      ]

      ;(mockPrisma.questionBookmark.findMany as jest.Mock).mockResolvedValue(mockBookmarks)

      const result = await service.getBookmarkedQuestions('user-1')

      expect(result).toHaveLength(1)
      expect(result[0].questionId).toBe('question-1')
    })

    it('should return empty array when no bookmarks', async () => {
      ;(mockPrisma.questionBookmark.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.getBookmarkedQuestions('user-1')

      expect(result).toEqual([])
    })
  })

  describe('removeBookmark', () => {
    it('should remove bookmark successfully', async () => {
      ;(mockPrisma.questionBookmark.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

      await service.removeBookmark('user-1', 'question-1')

      expect(mockPrisma.questionBookmark.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', questionId: 'question-1' },
      })
    })
  })

  describe('getAttemptHistory', () => {
    const mockAttempts = [
      {
        id: 'attempt-1',
        testId: 'test-1',
        userId: 'user-1',
        status: 'COMPLETED',
        score: 80,
        totalPoints: 100,
        percentage: 80,
        passed: true,
        timeTaken: 1800,
        attemptNumber: 1,
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
        test: {
          id: 'test-1',
          title: 'Math Test',
          mode: 'TIMED',
          difficulty: 'EASY',
          timeLimit: 60,
          passingScore: 60,
          isAiGenerated: false,
        },
      },
    ]

    it('should return attempt history with pagination', async () => {
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(mockAttempts)
      ;(mockPrisma.testResult.count as jest.Mock).mockResolvedValue(1)

      const result = await service.getAttemptHistory('user-1')

      expect(result.attempts).toHaveLength(1)
      expect(result.attempts[0].test_id).toBe('test-1')
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
    })

    it('should filter by testId', async () => {
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(mockAttempts)
      ;(mockPrisma.testResult.count as jest.Mock).mockResolvedValue(1)

      await service.getAttemptHistory('user-1', { testId: 'test-1' })

      expect(mockPrisma.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ testId: 'test-1' }),
        })
      )
    })

    it('should filter by status', async () => {
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(mockAttempts)
      ;(mockPrisma.testResult.count as jest.Mock).mockResolvedValue(1)

      await service.getAttemptHistory('user-1', { status: 'COMPLETED' })

      expect(mockPrisma.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        })
      )
    })

    it('should respect pagination limits', async () => {
      const emptyAttempts: any[] = []
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(emptyAttempts)
      ;(mockPrisma.testResult.count as jest.Mock).mockResolvedValue(0)

      const result = await service.getAttemptHistory('user-1', { page: 2, limit: 10 })

      expect(result.attempts).toEqual([])
      expect(mockPrisma.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        })
      )
    })
  })

  describe('validateTimeRemaining', () => {
    it('should return valid time remaining', async () => {
      const startedAt = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'attempt-1',
        userId: 'user-1',
        testId: 'test-1',
        status: 'IN_PROGRESS',
        startedAt,
        test: { timeLimit: 60 }, // 60 minutes
      })

      const result = await service.validateTimeRemaining('user-1', 'test-1')

      expect(result.isValid).toBe(true)
      expect(result.timeLimitSeconds).toBe(3600) // 60 * 60
      expect(result.remainingSeconds).toBeGreaterThan(2900) // ~50 minutes remaining
      expect(result.remainingSeconds).toBeLessThanOrEqual(3600)
    })

    it('should return invalid when time expired', async () => {
      const startedAt = new Date(Date.now() - 120 * 60 * 1000) // 120 minutes ago
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue({
        id: 'attempt-1',
        userId: 'user-1',
        testId: 'test-1',
        status: 'IN_PROGRESS',
        startedAt,
        test: { timeLimit: 60 }, // 60 minutes
      })

      const result = await service.validateTimeRemaining('user-1', 'test-1')

      expect(result.isValid).toBe(false)
      expect(result.remainingSeconds).toBe(0)
    })

    it('should return invalid when no attempt found', async () => {
      ;(mockPrisma.testResult.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await service.validateTimeRemaining('user-1', 'test-1')

      expect(result.isValid).toBe(false)
      expect(result.remainingSeconds).toBe(0)
      expect(result.timeLimitSeconds).toBe(0)
    })
  })

  describe('autoSubmitExpiredTests', () => {
    it('should auto-submit expired tests', async () => {
      const expiredAttempts = [{
        id: 'attempt-1',
        userId: 'user-1',
        testId: 'test-1',
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 120 * 60 * 1000), // 120 minutes ago
        answers: { 'q1': 'opt1' },
        test: {
          timeLimit: 60, // 60 minutes
          passingScore: 60,
          questions: [
            {
              id: 'q1',
              points: 10,
              options: [
                { id: 'opt1', isCorrect: true },
                { id: 'opt2', isCorrect: false },
              ],
            },
            {
              id: 'q2',
              points: 10,
              options: [
                { id: 'opt3', isCorrect: true },
                { id: 'opt4', isCorrect: false },
              ],
            },
          ],
        },
      }]

      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(expiredAttempts)
      ;(mockPrisma.testResult.update as jest.Mock).mockResolvedValue({})

      const count = await service.autoSubmitExpiredTests()

      expect(count).toBe(1)
      expect(mockPrisma.testResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'attempt-1' },
          data: expect.objectContaining({
            status: 'TIMEOUT',
            completedAt: expect.any(Date),
          }),
        })
      )
    })

    it('should not submit tests that are not expired', async () => {
      const activeAttempts = [{
        id: 'attempt-1',
        userId: 'user-1',
        testId: 'test-1',
        status: 'IN_PROGRESS',
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        answers: {},
        test: {
          timeLimit: 60, // 60 minutes
          passingScore: 60,
          questions: [],
        },
      }]

      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(activeAttempts)
      ;(mockPrisma.testResult.update as jest.Mock).mockResolvedValue({})

      const count = await service.autoSubmitExpiredTests()

      expect(count).toBe(0)
      expect(mockPrisma.testResult.update).not.toHaveBeenCalled()
    })

    it('should return 0 when no expired tests', async () => {
      const emptyAttempts: any[] = []
      ;(mockPrisma.testResult.findMany as jest.Mock).mockResolvedValue(emptyAttempts)

      const count = await service.autoSubmitExpiredTests()

      expect(count).toBe(0)
    })
  })
})

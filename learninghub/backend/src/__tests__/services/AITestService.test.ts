import { AITestService } from '../../services/AITestService'
import { AIServiceFactory } from '../../services/ai/AIServiceFactory'
import { prisma } from '../../prismaClient'

// Mock dependencies
jest.mock('../../prismaClient', () => ({
  prisma: {
    test: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    exam: {
      findUnique: jest.fn(),
    },
    topicPerformance: {
      findFirst: jest.fn(),
    },
    testResult: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('../../services/CacheService', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    generateKey: jest.fn().mockReturnValue('mock-key'),
  },
}))

describe('AITestService', () => {
  let aiTestService: AITestService
  let mockGenerateJSON: jest.Mock

  beforeEach(() => {
    aiTestService = new AITestService()

    // Setup AIServiceFactory mock
    mockGenerateJSON = jest.fn()
    jest.spyOn(AIServiceFactory, 'getAgent').mockReturnValue({
      generateJSON: mockGenerateJSON,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    jest.clearAllMocks()
    ;(prisma.test.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.question.findMany as jest.Mock).mockResolvedValue([])
  })

  describe('generateTest', () => {
    it('should generate a standard test successfully', async () => {
      // Arrange
      const req = {
        userId: 'user-123',
        topic: 'Machine Learning',
        difficulty: 'MEDIUM' as const,
        count: 5,
        mode: 'PRACTICE' as const,
      }

      mockGenerateJSON.mockResolvedValue({
        questions: [
          {
            text: 'What is a neural network?',
            options: [
              { id: 'a', text: 'A database' },
              { id: 'b', text: 'A mathematical model' },
              { id: 'c', text: 'A UI component' },
              { id: 'd', text: 'A networking protocol' },
            ],
            correct_option_id: 'b',
            explanation: 'It is a mathematical model inspired by the brain.',
            difficulty: 'MEDIUM',
            bloom_level: 'understand',
            tags: ['ML'],
          },
        ],
      })
      ;(prisma.test.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.question.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.test.create as jest.Mock).mockResolvedValue({
        id: 'test-123',
        title: 'Machine Learning Practice',
        questions: [
          {
            text: 'What is a neural network?',
            difficulty: 0.5,
            bloomLevel: 'UNDERSTAND',
            explanation: 'It is a mathematical model inspired by the brain.',
            tags: ['ML'],
            options: [
              { id: 'a', text: 'A database' },
              { id: 'b', text: 'A mathematical model' },
              { id: 'c', text: 'A UI component' },
              { id: 'd', text: 'A networking protocol' },
            ],
          },
        ],
      })

      // Act
      const result = await aiTestService.generateTest(req)

      // Assert
      expect(mockGenerateJSON).toHaveBeenCalledTimes(1)
      expect(result).toBeDefined()
      expect(result.questions).toHaveLength(1)
      expect(result.ai_powered).toBe(true)
    })

    it('should retry and succeed if subjective grading returns invalid schema first', async () => {
      // Arrange
      mockGenerateJSON
        .mockResolvedValueOnce({ bad_schema: true }) // First call bad
        .mockResolvedValueOnce({ score: 7, feedback: 'Okay' }) // Second call good

      // Act
      const result = await aiTestService.gradeSubjectiveAnswer('Q', 'A', 10)

      // Assert
      expect(mockGenerateJSON).toHaveBeenCalledTimes(2)
      expect(result.score).toBe(7)
      expect(result.feedback).toBe('Okay')
    })

    it('should return 0 score and manual review feedback if AI repeatedly fails validation', async () => {
      // Arrange
      mockGenerateJSON.mockResolvedValue({ wrong_format: 100 })

      // Act
      const result = await aiTestService.gradeSubjectiveAnswer('Q', 'A', 10)

      // Assert
      expect(mockGenerateJSON).toHaveBeenCalledTimes(3) // initial + 2 retries
      expect(result.score).toBe(0)
      expect(result.feedback).toBe('Failed to grade via AI. Needs manual review.')
    })

    it('should fallback to mock mode if AI generates invalid or zero questions', async () => {
      // Arrange
      const req = {
        userId: 'user-123',
        topic: 'Machine Learning',
        difficulty: 'EASY' as const,
        count: 2,
        mode: 'PRACTICE' as const,
      }

      mockGenerateJSON.mockResolvedValue({
        questions: [], // Invalid/empty
      })
      ;(prisma.test.create as jest.Mock).mockResolvedValue({
        id: 'test-mock',
        title: 'Mock Test',
        questions: [
          {
            text: '[MOCK] Sample Question 1 for topic: Machine Learning',
            difficulty: 0.2,
            bloomLevel: 'UNDERSTAND',
            explanation:
              'This is a mock explanation because the AI service is currently unavailable.',
            tags: ['Machine Learning', 'mock'],
            options: [
              { id: 'a', text: 'Option A (Correct)' },
              { id: 'b', text: 'Option B' },
            ],
          },
        ],
      })

      // Act
      const result = await aiTestService.generateTest(req)

      // Assert
      expect(result.ai_powered).toBe(false)
      expect(result.model).toBe('mock')
      expect(result.questions[0].text).toContain('[MOCK]')
    })

    it('should retry and succeed if AI generates invalid schema first but succeeds on second try', async () => {
      // Arrange
      const req = {
        userId: 'user-123',
        topic: 'Machine Learning',
        difficulty: 'MEDIUM' as const,
        count: 1,
        mode: 'PRACTICE' as const,
      }

      // First call fails Zod (missing options), second call succeeds
      mockGenerateJSON
        .mockResolvedValueOnce({
          questions: [
            { text: 'Bad schema question', correct_option_id: 'a', explanation: 'exp' }, // missing options
          ],
        })
        .mockResolvedValueOnce({
          questions: [
            {
              text: 'Good question?',
              options: [
                { id: 'a', text: 'A' },
                { id: 'b', text: 'B' },
                { id: 'c', text: 'C' },
                { id: 'd', text: 'D' },
              ],
              correct_option_id: 'a',
              explanation: 'Yes',
              difficulty: 'MEDIUM',
            },
          ],
        })
      ;(prisma.test.create as jest.Mock).mockResolvedValue({
        id: 'test-123',
        title: 'Machine Learning Practice',
        questions: [
          {
            text: 'Good question?',
            difficulty: 1.5,
            explanation: 'Yes',
            options: [
              { id: 'a', text: 'A', isCorrect: true },
              { id: 'b', text: 'B', isCorrect: false },
              { id: 'c', text: 'C', isCorrect: false },
              { id: 'd', text: 'D', isCorrect: false },
            ],
          },
        ],
      })

      // Act
      const result = await aiTestService.generateTest(req)

      // Assert
      expect(mockGenerateJSON).toHaveBeenCalledTimes(2)
      expect(result.ai_powered).toBe(true)
    })

    it('should fallback to mock mode if AI repeatedly fails schema validation', async () => {
      // Arrange
      const req = {
        userId: 'user-123',
        topic: 'Machine Learning',
        difficulty: 'EASY' as const,
        count: 1,
        mode: 'PRACTICE' as const,
      }

      // Repeatedly return bad schema
      mockGenerateJSON.mockResolvedValue({
        malformed: 'data',
        no_questions_here: true,
      })
      ;(prisma.test.create as jest.Mock).mockResolvedValue({
        id: 'test-mock',
        title: 'Mock Test',
        questions: [
          {
            text: '[MOCK] Sample Question 1 for topic: Machine Learning',
            difficulty: 0.3,
            explanation: 'mock exp',
            options: [
              { id: 'a', text: 'Option A (Correct)', isCorrect: true },
              { id: 'b', text: 'Option B', isCorrect: false },
              { id: 'c', text: 'Option C', isCorrect: false },
              { id: 'd', text: 'Option D', isCorrect: false },
            ],
          },
        ],
      })

      // Act
      const result = await aiTestService.generateTest(req)

      // Assert
      expect(mockGenerateJSON).toHaveBeenCalledTimes(3) // initial + 2 retries
      expect(result.ai_powered).toBe(false)
      expect(result.model).toBe('mock')
    })

    it('should generate an adaptive test based on user level', async () => {
      // Arrange
      const req = {
        userId: 'user-123',
        topic: 'Python',
        difficulty: 'ADAPTIVE' as const,
        count: 3,
        mode: 'ADAPTIVE' as const,
      }

      ;(prisma.topicPerformance.findFirst as jest.Mock).mockResolvedValue({
        strengthLevel: 'proficient', // maps to level 4
      })

      mockGenerateJSON.mockResolvedValue({
        questions: [
          {
            text: 'Adaptive Question 1',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
              { id: 'c', text: 'C' },
              { id: 'd', text: 'D' },
            ],
            correct_option_id: 'a',
            explanation: 'Exp',
            difficulty: 'HARD',
            bloom_level: 'apply',
          },
        ],
      })
      ;(prisma.test.create as jest.Mock).mockResolvedValue({
        id: 'test-adaptive',
        title: 'Adaptive Python Test',
        questions: [
          {
            text: 'Adaptive Question 1',
            difficulty: 0.8,
            bloomLevel: 'APPLY',
            explanation: 'Exp',
            tags: ['Python'],
            options: [{ id: 'a', text: 'A' }],
          },
        ],
      })

      // Act
      const result = await aiTestService.generateTest(req)

      // Assert
      expect(prisma.topicPerformance.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [{ topicId: 'Python' }, { topicName: { equals: 'Python', mode: 'insensitive' } }],
        },
      })
      expect(mockGenerateJSON).toHaveBeenCalledTimes(1)

      const promptArg = mockGenerateJSON.mock.calls[0][0]
      expect(promptArg).toContain('Current learner level: 4/5')
      expect(result.questions).toHaveLength(1)
    })

    it('should generate an exam-pattern test', async () => {
      // Arrange
      const req = {
        userId: 'user-123',
        topic: 'Biology',
        difficulty: 'HARD' as const,
        count: 5,
        mode: 'MOCK' as const,
        examContext: {
          examId: 'exam-jee',
        },
      }

      ;(prisma.exam.findUnique as jest.Mock).mockResolvedValue({
        name: 'JEE Advanced',
        pattern: 'Multiple Correct Options',
      })

      mockGenerateJSON.mockResolvedValue({
        questions: [
          {
            text: 'Exam Question',
            options: [
              { id: 'a', text: '1' },
              { id: 'b', text: '2' },
              { id: 'c', text: '3' },
              { id: 'd', text: '4' },
            ],
            correct_option_id: 'a',
            explanation: 'Exp',
            difficulty: 'HARD',
            bloom_level: 'evaluate',
          },
        ],
      })
      ;(prisma.test.create as jest.Mock).mockResolvedValue({
        id: 'test-exam',
        title: 'Biology JEE Advanced Mock',
        questions: [
          {
            text: 'Exam Question',
            difficulty: 0.8,
            bloomLevel: 'EVALUATE',
            explanation: 'Exp',
            tags: ['Biology'],
            options: [{ id: 'a', text: '1' }],
          },
        ],
      })

      // Act
      await aiTestService.generateTest(req)

      // Assert
      expect(prisma.exam.findUnique).toHaveBeenCalledWith({
        where: { id: 'exam-jee' },
        select: { name: true, pattern: true },
      })

      const promptArg = mockGenerateJSON.mock.calls[0][0]
      expect(promptArg).toContain('<exam_name>JEE Advanced</exam_name>')
      expect(promptArg).toContain('<exam_pattern>"Multiple Correct Options"</exam_pattern>')
    })
  })

  describe('gradeSubjectiveAnswer', () => {
    it('should grade a subjective answer successfully', async () => {
      // Arrange
      const questionText = 'Explain how a neural network learns.'
      const answerText = 'It uses backpropagation to update weights based on the error.'
      const maxPoints = 10

      mockGenerateJSON.mockResolvedValue({
        score: 8,
        feedback:
          'Good explanation of backpropagation, but missed mentioning the forward pass and activation functions.',
      })

      // Act
      const result = await aiTestService.gradeSubjectiveAnswer(questionText, answerText, maxPoints)

      // Assert
      expect(mockGenerateJSON).toHaveBeenCalledTimes(1)
      const promptArg = mockGenerateJSON.mock.calls[0][0]
      expect(promptArg).toContain(questionText)
      expect(promptArg).toContain(answerText)
      expect(promptArg).toContain(`between 0 and ${maxPoints}`)

      expect(result.score).toBe(8)
      expect(result.feedback).toContain('Good explanation')
    })

    it('should throw an error if the AI service fails to grade', async () => {
      // Arrange
      const questionText = 'Explain how a neural network learns.'
      const answerText = 'It uses backpropagation.'
      const maxPoints = 5

      mockGenerateJSON.mockRejectedValue(new Error('AI Service Unavailable'))

      const result = await aiTestService.gradeSubjectiveAnswer(questionText, answerText, maxPoints)

      expect(result.score).toBe(0)
      expect(result.feedback).toContain('Failed to grade via AI. Needs manual review.')
    })
  })
})

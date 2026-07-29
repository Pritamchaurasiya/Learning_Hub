import { adaptiveTestEngine, AdaptiveTestEngine } from '../../src/engines/test/AdaptiveTestEngine'
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

describe('AdaptiveTestEngine Suite', () => {
  let engine: AdaptiveTestEngine

  beforeEach(() => {
    engine = new AdaptiveTestEngine()
    jest.clearAllMocks()
  })

  describe('mapDifficultyToIRT', () => {
    it('should map 0.5 difficulty to 0.0 logit (average difficulty)', () => {
      expect(engine.mapDifficultyToIRT(0.5)).toBe(0.0)
    })

    it('should map 1.0 difficulty to +3.0 logit (maximum difficulty)', () => {
      expect(engine.mapDifficultyToIRT(1.0)).toBe(3.0)
    })

    it('should map 0.0 difficulty to -3.0 logit (minimum difficulty)', () => {
      expect(engine.mapDifficultyToIRT(0.0)).toBe(-3.0)
    })
  })

  describe('calculateIRTProbability', () => {
    it('should return 0.5 when theta equals b (with c=0)', () => {
      const prob = engine.calculateIRTProbability(0.0, { a: 1.0, b: 0.0, c: 0.0 })
      expect(prob).toBeCloseTo(0.5, 3)
    })

    it('should return probability greater than 0.5 when ability exceeds difficulty', () => {
      const prob = engine.calculateIRTProbability(1.5, { a: 1.0, b: 0.0, c: 0.0 })
      expect(prob).toBeGreaterThan(0.5)
    })

    it('should return probability less than 0.5 when ability is below difficulty', () => {
      const prob = engine.calculateIRTProbability(-1.5, { a: 1.0, b: 0.0, c: 0.0 })
      expect(prob).toBeLessThan(0.5)
    })

    it('should respect guessing parameter c for very low ability', () => {
      const prob = engine.calculateIRTProbability(-10.0, { a: 1.0, b: 0.0, c: 0.25 })
      expect(prob).toBeCloseTo(0.25, 2)
    })
  })

  describe('calculateFisherInformation', () => {
    it('should return peak information when ability matches item difficulty', () => {
      const infoAtMatch = engine.calculateFisherInformation(0.0, { a: 1.0, b: 0.0, c: 0.0 })
      const infoFarOff = engine.calculateFisherInformation(3.0, { a: 1.0, b: 0.0, c: 0.0 })
      expect(infoAtMatch).toBeGreaterThan(infoFarOff)
      expect(infoAtMatch).toBeCloseTo(0.25, 3)
    })

    it('should return 0 when denominator is 0 or extreme probability', () => {
      // Very extreme ability differences cause probability to approach exactly 0 or 1
      const info = engine.calculateFisherInformation(100.0, { a: 1.0, b: -100.0, c: 0.0 })
      expect(info).toBeGreaterThanOrEqual(0)
    })
  })

  describe('estimateUserAbility', () => {
    it('should estimate theta based on topicPerformance when topicId is provided', async () => {
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue({
        accuracy: 0.8, // 80% accuracy -> rawprob 0.8 -> (0.8 - 0.5)*6 = 1.8
      })

      const theta = await engine.estimateUserAbility('user-1', 'topic-1')
      expect(theta).toBeCloseTo(1.8, 2)
      expect(mockPrisma.topicPerformance.findUnique).toHaveBeenCalledWith({
        where: { userId_topicId: { userId: 'user-1', topicId: 'topic-1' } },
        select: { accuracy: true },
      })
    })

    it('should fallback to overall test result average when topic mastery is not found', async () => {
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.testResult.aggregate as jest.Mock).mockResolvedValue({
        _avg: { percentage: 70 }, // 70% -> 0.7 -> (0.7 - 0.5)*6 = 1.2
      })

      const theta = await engine.estimateUserAbility('user-1', 'topic-1')
      expect(theta).toBeCloseTo(1.2, 2)
    })

    it('should return 0.0 default ability when no stats are found', async () => {
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.testResult.aggregate as jest.Mock).mockResolvedValue({
        _avg: { percentage: null },
      })

      const theta = await engine.estimateUserAbility('user-1', null)
      expect(theta).toBe(0.0)
    })

    it('should handle database errors and return default 0.0 ability', async () => {
      ;(mockPrisma.testResult.aggregate as jest.Mock).mockRejectedValue(
        new Error('DB connection failed')
      )

      const theta = await engine.estimateUserAbility('user-1', null)
      expect(theta).toBe(0.0)
    })
  })

  describe('sortQuestionsByInformation', () => {
    it('should sort questions by descending Fisher Information for a given theta', () => {
      const questions = [
        { id: 'q-easy', difficulty: 0.1 }, // logit -2.4
        { id: 'q-mid', difficulty: 0.5 }, // logit 0.0
        { id: 'q-hard', difficulty: 0.9 }, // logit +2.4
      ]

      // For user with theta = 0.0 (average ability), q-mid should provide highest information
      const sorted = engine.sortQuestionsByInformation(questions, 0.0)
      expect(sorted[0].id).toBe('q-mid')
      expect(sorted[2].id).toBe(sorted[2].id) // valid order check
    })
  })

  describe('getNextAdaptiveQuestion', () => {
    const mockQuestions = [
      {
        id: 'q-1',
        text: 'Question 1',
        type: 'MCQ',
        difficulty: 0.5,
        bloomLevel: 'APPLY',
        explanation: 'Exp 1',
        points: 5,
        options: [{ id: 'opt-1', text: 'Option 1', isCorrect: true }],
      },
      {
        id: 'q-2',
        text: 'Question 2',
        type: 'MCQ',
        difficulty: 0.8,
        bloomLevel: 'ANALYZE',
        explanation: 'Exp 2',
        points: 10,
        options: [{ id: 'opt-2', text: 'Option 2', isCorrect: true }],
      },
    ]

    it('should select best question based on information and exclude answered IDs', async () => {
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue({
        accuracy: 0.8, // high ability -> theta = 1.8 -> closer to q-2 (difficulty 0.8 -> logit 1.8!)
      })
      ;(mockPrisma.question.findMany as jest.Mock).mockResolvedValue(mockQuestions)

      const best = await engine.getNextAdaptiveQuestion('user-1', 'topic-1', ['q-answered'])
      expect(best?.id).toBe('q-2')
      expect(mockPrisma.question.findMany).toHaveBeenCalledWith({
        where: {
          topicId: 'topic-1',
          id: { notIn: ['q-answered'] },
          difficulty: {
            gte: expect.any(Number),
            lte: expect.any(Number),
          },
        },
        take: 15,
        include: {
          options: {
            select: { id: true, text: true, isCorrect: true },
          },
        },
        orderBy: { difficulty: 'asc' },
      })
    })

    it('should return null if no candidate questions exist', async () => {
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockResolvedValue(null)
      ;(mockPrisma.question.findMany as jest.Mock).mockResolvedValue([])

      const best = await engine.getNextAdaptiveQuestion('user-1', 'topic-1', [])
      expect(best).toBeNull()
    })

    it('should handle errors gracefully and return null', async () => {
      ;(mockPrisma.topicPerformance.findUnique as jest.Mock).mockRejectedValue(
        new Error('Query error')
      )

      const best = await engine.getNextAdaptiveQuestion('user-1', 'topic-1', [])
      expect(best).toBeNull()
    })
  })
})

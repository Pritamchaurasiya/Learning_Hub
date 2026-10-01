import { adaptiveAssessmentEngine } from '../../engines/test/AdaptiveAssessmentEngine'
import { prisma } from '../../prismaClient'

jest.mock('../../prismaClient', () => ({
  prisma: {
    test: {
      findUnique: jest.fn(),
    },
    testAttemptAnswer: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    testResult: {
      update: jest.fn().mockResolvedValue({}),
    },
  },
}))

describe('AdaptiveAssessmentEngine', () => {
  describe('Psychometrics & 3PL Modeling', () => {
    it('calculates 3PL probability correctly', () => {
      const item = { a: 1.0, b: 0.0, c: 0.2 }
      const probAtB = adaptiveAssessmentEngine.calculateProbability(0.0, item)
      // At theta = b, 3PL is c + (1 - c)/2 = 0.2 + 0.4 = 0.6
      expect(probAtB).toBeCloseTo(0.6, 2)

      const probHigh = adaptiveAssessmentEngine.calculateProbability(3.0, item)
      expect(probHigh).toBeGreaterThan(0.9)

      const probLow = adaptiveAssessmentEngine.calculateProbability(-3.0, item)
      expect(probLow).toBeCloseTo(0.2, 1)
    })

    it('calculates Fisher Information correctly', () => {
      const item = { a: 1.5, b: 0.5, c: 0.0 }
      const infoNearB = adaptiveAssessmentEngine.calculateFisherInformation(0.5, item)
      const infoFar = adaptiveAssessmentEngine.calculateFisherInformation(3.0, item)
      expect(infoNearB).toBeGreaterThan(infoFar)
    })

    it('estimates ability using Bayesian EAP without divergence', () => {
      const items = [
        { a: 1.0, b: -1.0, c: 0.2 },
        { a: 1.0, b: 0.0, c: 0.2 },
        { a: 1.0, b: 1.0, c: 0.2 },
      ]

      // All correct: should estimate high ability, bounded
      const resHigh = adaptiveAssessmentEngine.estimateAbilityEAP([1, 1, 1], items)
      expect(resHigh.theta).toBeGreaterThan(0.5)
      expect(resHigh.theta).toBeLessThanOrEqual(3.5)
      expect(resHigh.sem).toBeGreaterThan(0)

      // All wrong: should estimate low ability, bounded
      const resLow = adaptiveAssessmentEngine.estimateAbilityEAP([0, 0, 0], items)
      expect(resLow.theta).toBeLessThan(-0.5)
      expect(resLow.theta).toBeGreaterThanOrEqual(-3.5)

      // Empty response returns prior mean
      const resEmpty = adaptiveAssessmentEngine.estimateAbilityEAP([], [])
      expect(resEmpty.theta).toBe(0.0)
    })

    it('maps theta to percentile rank correctly', () => {
      const pZero = adaptiveAssessmentEngine.thetaToPercentile(0.0)
      expect(pZero).toBeCloseTo(50, 0)

      const pHigh = adaptiveAssessmentEngine.thetaToPercentile(2.0)
      expect(pHigh).toBeGreaterThan(95)

      const pLow = adaptiveAssessmentEngine.thetaToPercentile(-2.0)
      expect(pLow).toBeLessThan(5)
    })

    it('maps theta to normalized 0-100 score correctly', () => {
      expect(adaptiveAssessmentEngine.thetaToNormalizedScore(-3.0)).toBe(0)
      expect(adaptiveAssessmentEngine.thetaToNormalizedScore(0.0)).toBe(50)
      expect(adaptiveAssessmentEngine.thetaToNormalizedScore(3.0)).toBe(100)
    })

    it('determines ability band appropriately', () => {
      expect(adaptiveAssessmentEngine.getAbilityBand(-2.0)).toBe('BEGINNER')
      expect(adaptiveAssessmentEngine.getAbilityBand(-0.5)).toBe('INTERMEDIATE')
      expect(adaptiveAssessmentEngine.getAbilityBand(0.2)).toBe('PROFICIENT')
      expect(adaptiveAssessmentEngine.getAbilityBand(1.2)).toBe('ADVANCED')
      expect(adaptiveAssessmentEngine.getAbilityBand(2.5)).toBe('MASTER')
    })
  })

  describe('Adaptive Assessment Step Execution', () => {
    const mockQuestions = [
      {
        id: 'q1',
        text: 'What is 2 + 2?',
        type: 'MCQ',
        difficulty: 0.2,
        bloomLevel: 'REMEMBER',
        points: 10,
        order: 1,
        options: [
          { id: 'opt1', text: '4', isCorrect: true, order: 1 },
          { id: 'opt2', text: '5', isCorrect: false, order: 2 },
        ],
      },
      {
        id: 'q2',
        text: 'What is the derivative of x^2?',
        type: 'MCQ',
        difficulty: 0.5,
        bloomLevel: 'APPLY',
        points: 10,
        order: 2,
        options: [
          { id: 'opt3', text: '2x', isCorrect: true, order: 1 },
          { id: 'opt4', text: 'x', isCorrect: false, order: 2 },
        ],
      },
      {
        id: 'q3',
        text: 'Solve the integral of e^x dx',
        type: 'MCQ',
        difficulty: 0.8,
        bloomLevel: 'ANALYZE',
        points: 10,
        order: 3,
        options: [
          { id: 'opt5', text: 'e^x + C', isCorrect: true, order: 1 },
          { id: 'opt6', text: 'xe^x + C', isCorrect: false, order: 2 },
        ],
      },
    ]

    it('processes adaptive answer and provides next question', async () => {
      ;(prisma.test.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-adaptive-1',
        passingScore: 60,
        questions: mockQuestions,
      })

      ;(prisma.testAttemptAnswer.findMany as jest.Mock).mockResolvedValue([
        { questionId: 'q1', isCorrect: true },
      ])

      const result = await adaptiveAssessmentEngine.processAdaptiveStep({
        testId: 'test-adaptive-1',
        userId: 'u1',
        attemptId: 'att1',
        questionId: 'q1',
        selectedOptionId: 'opt1',
        timeSpentSeconds: 15,
      })

      expect(result.isCorrect).toBe(true)
      expect(result.questionsAnswered).toBe(1)
      expect(result.nextQuestion).toBeDefined()
      expect(result.currentTheta).toBeDefined()
      expect(result.normalizedScore).toBeGreaterThan(0)
    })
  })
})

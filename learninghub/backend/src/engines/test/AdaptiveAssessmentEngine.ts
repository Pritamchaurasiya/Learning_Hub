import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'
import { IRTScoringEngine } from '../../services/IRTScoringEngine'

export interface ItemParameters {
  a: number // discrimination (typically 0.5 - 2.5)
  b: number // difficulty in logits (-3.0 to +3.0)
  c: number // guessing probability (0.0 - 0.35)
}

export interface AdaptiveStepResult {
  isCompleted: boolean
  isCorrect: boolean
  currentTheta: number // -3.0 to +3.0
  normalizedScore: number // 0 to 100
  sem: number // Standard Error of Measurement
  percentile: number // Estimated percentile rank (0 - 100)
  questionsAnswered: number
  totalQuestionsPool: number
  nextQuestion?: {
    id: string
    text: string
    type: string
    difficulty: number
    bloomLevel: string
    points: number
    order: number
    options: Array<{ id: string; text: string; order: number }>
  } | null
  diagnostics?: {
    abilityBand: 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | 'MASTER'
    confidenceInterval: [number, number]
    stoppingReason?: string
  }
}

export class AdaptiveAssessmentEngine {
  // Standard Gauss-Hermite quadrature nodes and weights for normal prior N(0, 1) across [-4, 4]
  private readonly quadratureNodes: number[] = [
    -4.0, -3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0,
  ]
  private readonly quadratureWeights: number[]

  constructor() {
    // Normal distribution prior weights normalized to sum to 1.0
    const rawWeights = this.quadratureNodes.map(x => Math.exp(-0.5 * x * x))
    const sum = rawWeights.reduce((a, b) => a + b, 0)
    this.quadratureWeights = rawWeights.map(w => w / sum)
  }

  /**
   * Probability of correct response under 3PL IRT model:
   * P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
   */
  public calculateProbability(theta: number, item: ItemParameters): number {
    return IRTScoringEngine.calculateProbability(theta, item.a, item.b, item.c)
  }

  /**
   * Fisher Information for an item at ability level theta:
   * I(theta) = (a^2 * (P - c)^2 * Q) / ((1 - c)^2 * P)
   */
  public calculateFisherInformation(theta: number, item: ItemParameters): number {
    const P = this.calculateProbability(theta, item)
    const Q = 1 - P
    const denom = (1 - item.c) ** 2 * P
    if (denom <= 1e-8 || Q <= 1e-8) return 0.0
    const numerator = (item.a ** 2) * ((P - item.c) ** 2) * Q
    return Math.max(0, numerator / denom)
  }

  /**
   * Bayesian Expected A Posteriori (EAP) ability estimation:
   * Provides guaranteed numerical stability without divergence, even for all-correct or all-incorrect responses.
   */
  public estimateAbilityEAP(
    responses: number[], // 1 for correct, 0 for incorrect
    items: ItemParameters[]
  ): { theta: number; sem: number } {
    if (responses.length === 0 || items.length === 0) {
      return { theta: 0.0, sem: 1.0 }
    }

    let numerator = 0.0
    let denominator = 0.0
    const likelihoods: number[] = []

    for (let k = 0; k < this.quadratureNodes.length; k++) {
      const X_k = this.quadratureNodes[k]
      const W_k = this.quadratureWeights[k]

      // Log-likelihood at node X_k
      let logL = 0.0
      for (let i = 0; i < responses.length; i++) {
        const u = responses[i]
        const P = this.calculateProbability(X_k, items[i])
        logL += u === 1 ? Math.log(P) : Math.log(1 - P)
      }

      // Bound logL to prevent numerical underflow
      const L = Math.exp(Math.max(-700, Math.min(700, logL))) * W_k
      likelihoods.push(L)
      numerator += X_k * L
      denominator += L
    }

    if (denominator <= 1e-12) {
      return { theta: 0.0, sem: 1.0 }
    }

    const thetaHat = Math.max(-3.5, Math.min(3.5, numerator / denominator))

    // Compute posterior variance for SEM
    let varNumerator = 0.0
    for (let k = 0; k < this.quadratureNodes.length; k++) {
      const X_k = this.quadratureNodes[k]
      const L = likelihoods[k]
      varNumerator += (X_k - thetaHat) ** 2 * L
    }

    const posteriorVariance = varNumerator / denominator
    const sem = Math.max(0.15, Math.sqrt(Math.max(0.01, posteriorVariance)))

    return { theta: Math.round(thetaHat * 100) / 100, sem: Math.round(sem * 100) / 100 }
  }

  /**
   * Convert IRT theta (-3.0 to +3.0) to percentile rank (0 to 100) using the standard normal CDF
   */
  public thetaToPercentile(theta: number): number {
    const z = theta
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z))
    const d = 0.3989423 * Math.exp((-z * z) / 2.0)
    const prob =
      d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    const cdf = z > 0 ? 1.0 - prob : prob
    return Math.round(Math.max(1, Math.min(99.9, cdf * 100)) * 10) / 10
  }

  /**
   * Map theta (-3.0 to +3.0) to normalized score (0 to 100)
   */
  public thetaToNormalizedScore(theta: number): number {
    const score = ((theta + 3.0) / 6.0) * 100
    return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10
  }

  /**
   * Determine ability band from theta
   */
  public getAbilityBand(
    theta: number
  ): 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'ADVANCED' | 'MASTER' {
    if (theta < -1.5) return 'BEGINNER'
    if (theta < -0.2) return 'INTERMEDIATE'
    if (theta < 0.8) return 'PROFICIENT'
    if (theta < 1.8) return 'ADVANCED'
    return 'MASTER'
  }

  /**
   * Map question model difficulty to IRT parameter b in logit space [-2.5, +2.5]
   */
  public mapQuestionToIRT(q: {
    difficulty?: number | null
    type?: string
    points?: number
  }): ItemParameters {
    const rawDiff = typeof q.difficulty === 'number' ? q.difficulty : 0.5
    const b = (rawDiff - 0.5) * 5.0
    const a = q.type === 'MSQ' ? 1.4 : q.type === 'NUMERICAL' ? 1.3 : 1.1
    const c = q.type === 'NUMERICAL' || q.type === 'SUBJECTIVE' ? 0.0 : 0.2
    return { a, b, c }
  }

  /**
   * Process an adaptive test step:
   * 1. Evaluates latest submitted response
   * 2. Updates history and re-estimates ability theta and SEM
   * 3. Checks termination criteria (SEM <= 0.30 or max questions reached)
   * 4. Selects optimal next question maximizing Fisher Information if not terminated
   */
  public async processAdaptiveStep({
    testId,
    userId,
    attemptId,
    questionId,
    selectedOptionId,
    timeSpentSeconds = 0,
  }: {
    testId: string
    userId: string
    attemptId: string
    questionId: string
    selectedOptionId: string | string[]
    timeSpentSeconds?: number
  }): Promise<AdaptiveStepResult> {
    // 1. Fetch test with all questions and options
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { select: { id: true, text: true, isCorrect: true, order: true } },
          },
        },
      },
    })

    if (!test) throw new Error('Test not found')

    const currentQuestion: any = test.questions.find((q: any) => q.id === questionId)
    if (!currentQuestion) throw new Error('Question not found in test')

    // 2. Evaluate correctness of this step
    const correctOptions: any[] = currentQuestion.options.filter((o: any) => o.isCorrect)
    const submittedIds = Array.isArray(selectedOptionId) ? selectedOptionId : [selectedOptionId]
    let isCorrect = false

    if (currentQuestion.type === 'MSQ') {
      const correctIds = correctOptions.map((o: any) => o.id).sort()
      const sortedSubmitted = [...submittedIds].sort()
      isCorrect =
        correctIds.length === sortedSubmitted.length &&
        correctIds.every((val: string, idx: number) => val === sortedSubmitted[idx])
    } else {
      isCorrect = correctOptions.some((o: any) => o.id === submittedIds[0])
    }

    const marksObtained = isCorrect ? currentQuestion.points : 0

    // 3. Persist this question attempt answer in DB
    await prisma.testAttemptAnswer.upsert({
      where: {
        testResultId_questionId: {
          testResultId: attemptId,
          questionId,
        },
      },
      update: {
        selectedOptions: submittedIds,
        isCorrect,
        marksObtained,
        timeSpent: timeSpentSeconds,
      },
      create: {
        testResultId: attemptId,
        questionId,
        selectedOptions: submittedIds,
        isCorrect,
        marksObtained,
        timeSpent: timeSpentSeconds,
      },
    })

    // 4. Fetch all answered questions for this attempt to build response history
    const allAnswers = await prisma.testAttemptAnswer.findMany({
      where: { testResultId: attemptId },
      select: { questionId: true, isCorrect: true },
    })

    const answeredMap = new Map<string, number>(
      allAnswers.map((a: any) => [a.questionId, a.isCorrect === true ? 1 : 0])
    )
    const answeredQuestionIds = Array.from(answeredMap.keys())

    const responses: number[] = []
    const parameters: ItemParameters[] = []

    for (const q of test.questions) {
      if (answeredMap.has(q.id)) {
        const val = answeredMap.get(q.id)
        if (typeof val === 'number') {
          responses.push(val)
          parameters.push(this.mapQuestionToIRT(q))
        }
      }
    }

    // 5. Calculate updated ability theta and SEM
    const { theta, sem } = this.estimateAbilityEAP(responses, parameters)
    const normalizedScore = this.thetaToNormalizedScore(theta)
    const percentile = this.thetaToPercentile(theta)
    const abilityBand = this.getAbilityBand(theta)

    const MIN_QUESTIONS = 5
    const MAX_QUESTIONS = Math.min(15, test.questions.length)
    const TARGET_SEM = 0.3

    const poolRemaining: any[] = test.questions.filter((q: any) => !answeredQuestionIds.includes(q.id))
    const isPrecisionReached = responses.length >= MIN_QUESTIONS && sem <= TARGET_SEM
    const isCapReached = responses.length >= MAX_QUESTIONS || poolRemaining.length === 0

    const isCompleted = isPrecisionReached || isCapReached

    if (isCompleted) {
      const stoppingReason = isPrecisionReached
        ? `Statistical convergence reached with high confidence (SEM: ${sem} <= ${TARGET_SEM})`
        : `Assessment completed (${responses.length} questions evaluated)`

      await prisma.testResult.update({
        where: { id: attemptId },
        data: {
          score: Math.round(normalizedScore),
          percentage: normalizedScore,
          passed: normalizedScore >= test.passingScore,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      return {
        isCompleted: true,
        isCorrect,
        currentTheta: theta,
        normalizedScore,
        sem,
        percentile,
        questionsAnswered: responses.length,
        totalQuestionsPool: test.questions.length,
        nextQuestion: null,
        diagnostics: {
          abilityBand,
          confidenceInterval: [
            Math.round((theta - 1.96 * sem) * 100) / 100,
            Math.round((theta + 1.96 * sem) * 100) / 100,
          ],
          stoppingReason,
        },
      }
    }

    // 6. Select next best question using Fisher Information maximization at current theta
    const candidatesWithInfo = poolRemaining.map((q: any) => {
      const params = this.mapQuestionToIRT(q)
      const info = this.calculateFisherInformation(theta, params)
      return { question: q, info }
    })

    candidatesWithInfo.sort((a: any, b: any) => b.info - a.info)

    const topSlice = candidatesWithInfo.slice(0, Math.min(2, candidatesWithInfo.length))
    const chosenIndex = Math.floor(Math.random() * topSlice.length)
    const chosen = topSlice[chosenIndex].question

    return {
      isCompleted: false,
      isCorrect,
      currentTheta: theta,
      normalizedScore,
      sem,
      percentile,
      questionsAnswered: responses.length,
      totalQuestionsPool: test.questions.length,
      nextQuestion: {
        id: chosen.id,
        text: chosen.text,
        type: chosen.type,
        difficulty: chosen.difficulty ?? 0.5,
        bloomLevel: chosen.bloomLevel ?? 'UNDERSTAND',
        points: chosen.points,
        order: responses.length + 1,
        options: chosen.options.map((o: any) => ({ id: o.id, text: o.text, order: o.order })),
      },
      diagnostics: {
        abilityBand,
        confidenceInterval: [
          Math.round((theta - 1.96 * sem) * 100) / 100,
          Math.round((theta + 1.96 * sem) * 100) / 100,
        ],
      },
    }
  }
}

export const adaptiveAssessmentEngine = new AdaptiveAssessmentEngine()

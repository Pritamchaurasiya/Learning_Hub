import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

export interface IRTParams {
  a: number
  b: number
  c: number
}

export interface QuestionWithOptions {
  id: string
  text: string
  type: string
  difficulty: number
  bloomLevel: string
  explanation: string | null
  points: number
  options: { id: string; text: string; isCorrect: boolean }[]
}

export class AdaptiveTestEngine {
  public calculateIRTProbability(theta: number, params: IRTParams): number {
    const exponent = Math.max(-20, Math.min(20, -params.a * (theta - params.b)))
    return params.c + (1 - params.c) / (1 + Math.exp(exponent))
  }

  public calculateFisherInformation(theta: number, params: IRTParams): number {
    const p = this.calculateIRTProbability(theta, params)
    const q = 1 - p
    const exponent = Math.max(-20, Math.min(20, -params.a * (theta - params.b)))
    const expVal = Math.exp(exponent)
    const pDeriv = (params.a * (1 - params.c) * expVal) / (1 + expVal) ** 2
    const denom = p * q
    if (denom <= 1e-8) return 0
    return pDeriv ** 2 / denom
  }

  /**
   * Get the optimal difficulty (b parameter) for a given theta.
   * For 2PL model (c=0), Fisher Information is maximized when b = theta.
   * For 3PL model (c>0), maximum is near b = theta + ln((1-c)/c)/a.
   * We use the 2PL approximation since c=0.0 in our current setup.
   */
  private getOptimalDifficultyForTheta(theta: number): number {
    // For 2PL model with a=1.0, c=0.0: Fisher info is maximized when b = theta
    // Map IRT b back to our 0-1 difficulty scale: difficulty = b/6 + 0.5
    return theta / 6 + 0.5
  }

  public async getNextAdaptiveQuestion(
    userId: string,
    topicId: string,
    answeredQuestionIds: string[]
  ): Promise<QuestionWithOptions | null> {
    try {
      const mastery = await prisma.topicPerformance.findUnique({
        where: { userId_topicId: { userId, topicId } },
        select: { accuracy: true },
      })

      const rawProb = mastery ? Math.max(0.01, Math.min(0.99, mastery.accuracy)) : 0.5
      const theta = (rawProb - 0.5) * 6

      // OPTIMIZATION: Calculate target difficulty and fetch only questions near that difficulty
      // This pushes filtering to SQL instead of fetching 50 questions and sorting in JS
      const targetDifficulty = this.getOptimalDifficultyForTheta(theta)
      const difficultyWindow = 0.2 // ±0.2 around target

      // First try: Get questions near optimal difficulty
      let candidateQuestions: any[] = await prisma.question.findMany({
        where: {
          topicId,
          id: answeredQuestionIds.length > 0 ? { notIn: answeredQuestionIds } : undefined,
          difficulty: {
            gte: targetDifficulty - difficultyWindow,
            lte: targetDifficulty + difficultyWindow,
          },
        },
        take: 15, // Much smaller than 50 since we pre-filter by difficulty
        include: {
          options: {
            select: { id: true, text: true, isCorrect: true },
          },
        },
        orderBy: { difficulty: 'asc' },
      })

      // Fallback: If no questions in window, expand search
      if (candidateQuestions.length === 0) {
        candidateQuestions = await prisma.question.findMany({
          where: {
            topicId,
            id: answeredQuestionIds.length > 0 ? { notIn: answeredQuestionIds } : undefined,
          },
          take: 25,
          include: {
            options: {
              select: { id: true, text: true, isCorrect: true },
            },
          },
        })
      }

      if (candidateQuestions.length === 0) return null

      // Sort by Fisher Information in JS (now on much smaller set)
      const sorted = this.sortQuestionsByInformation<any>(candidateQuestions, theta)
      const bestQuestion = sorted[0]

      return {
        id: bestQuestion.id,
        text: bestQuestion.text,
        type: bestQuestion.type,
        difficulty: bestQuestion.difficulty,
        bloomLevel: bestQuestion.bloomLevel,
        explanation: bestQuestion.explanation,
        points: bestQuestion.points,
        options: bestQuestion.options.map((o: any) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      }
    } catch (error) {
      logger.error(
        `[AdaptiveTestEngine] Failed for user ${userId} topic ${topicId}`,
        error instanceof Error ? error : new Error(String(error))
      )
      return null
    }
  }

  public mapDifficultyToIRT(difficultyLevel: number): number {
    return (difficultyLevel - 0.5) * 6
  }

  /**
   * Estimate a user's IRT ability parameter (theta) on a -3.0 to +3.0 logit scale.
   */
  public async estimateUserAbility(userId: string, topicId?: string | null): Promise<number> {
    try {
      if (topicId) {
        const mastery = await prisma.topicPerformance.findUnique({
          where: { userId_topicId: { userId, topicId } },
          select: { accuracy: true },
        })
        if (mastery) {
          const rawProb = Math.max(0.01, Math.min(0.99, mastery.accuracy))
          return (rawProb - 0.5) * 6
        }
      }

      // Fallback to overall user statistics or default ability 0.0
      const userStats = await prisma.testResult.aggregate({
        where: { userId, status: 'COMPLETED' },
        _avg: { percentage: true },
      })
      const avgPercentage = userStats._avg.percentage
      if (avgPercentage !== null && avgPercentage !== undefined) {
        const rawProb = Math.max(0.01, Math.min(0.99, avgPercentage / 100))
        return (rawProb - 0.5) * 6
      }

      return 0.0
    } catch (error) {
      logger.error(
        `[AdaptiveTestEngine] Failed to estimate ability for user ${userId}`,
        error instanceof Error ? error : new Error(String(error))
      )
      return 0.0
    }
  }

  /**
   * Sort an array of questions by Fisher Information descending for a given ability theta.
   */
  public sortQuestionsByInformation<T extends { difficulty: number }>(
    questions: T[],
    theta: number
  ): T[] {
    return [...questions].sort((a, b) => {
      const diffA = typeof a.difficulty === 'number' ? a.difficulty : 0.5
      const diffB = typeof b.difficulty === 'number' ? b.difficulty : 0.5
      const infoA = this.calculateFisherInformation(theta, {
        a: 1.0,
        b: this.mapDifficultyToIRT(diffA),
        c: 0.0,
      })
      const infoB = this.calculateFisherInformation(theta, {
        a: 1.0,
        b: this.mapDifficultyToIRT(diffB),
        c: 0.0,
      })
      return infoB - infoA
    })
  }
}

export const adaptiveTestEngine = new AdaptiveTestEngine()

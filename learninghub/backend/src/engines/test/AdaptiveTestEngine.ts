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

  public async getNextAdaptiveQuestion(
    userId: string,
    topicId: string,
    answeredQuestionIds: string[]
  ): Promise<QuestionWithOptions | null> {
    try {
      const mastery = await prisma.userTopicMastery.findUnique({
        where: { userId_topicId: { userId, topicId } },
        select: { accuracy: true },
      })

      const rawProb = mastery ? Math.max(0.01, Math.min(0.99, mastery.accuracy)) : 0.5
      const theta = (rawProb - 0.5) * 6

      const candidateQuestions = await prisma.question.findMany({
        where: {
          topicId,
          id: answeredQuestionIds.length > 0 ? { notIn: answeredQuestionIds } : undefined,
        },
        take: 50,
        include: {
          options: {
            select: { id: true, text: true, isCorrect: true },
          },
        },
      })

      if (candidateQuestions.length === 0) return null

      let bestQuestion = candidateQuestions[0]
      let maxInformation = -Infinity

      for (const q of candidateQuestions) {
        const b = this.mapDifficultyToIRT(q.difficulty)
        const info = this.calculateFisherInformation(theta, { a: 1.0, b, c: 0.0 })

        if (info > maxInformation) {
          maxInformation = info
          bestQuestion = q
        }
      }

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
        const mastery = await prisma.userTopicMastery.findUnique({
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
      const infoA = this.calculateFisherInformation(theta, {
        a: 1.0,
        b: this.mapDifficultyToIRT(a.difficulty),
        c: 0.0,
      })
      const infoB = this.calculateFisherInformation(theta, {
        a: 1.0,
        b: this.mapDifficultyToIRT(b.difficulty),
        c: 0.0,
      })
      return infoB - infoA
    })
  }
}

export const adaptiveTestEngine = new AdaptiveTestEngine()

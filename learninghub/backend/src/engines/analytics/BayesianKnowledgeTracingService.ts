import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

/**
 * Bayesian Knowledge Tracing (BKT) Parameters for a Topic.
 */
export interface BKTParams {
  pInit: number // Initial probability of knowing the skill
  pLearn: number // Probability of transitioning from unlearned to learned
  pGuess: number // Probability of guessing correctly without knowing
  pSlip: number // Probability of slipping (answering wrong despite knowing)
}

// Default BKT parameters if none are historically derived
const DEFAULT_BKT_PARAMS: BKTParams = {
  pInit: 0.1,
  pLearn: 0.2,
  pGuess: 0.25,
  pSlip: 0.1,
}

export class BayesianKnowledgeTracingService {
  /**
   * Calculate the new knowledge probability given an observation (correct/incorrect).
   */
  public calculateNextProbability(
    currentProb: number,
    isCorrect: boolean,
    params: BKTParams = DEFAULT_BKT_PARAMS
  ): number {
    let probKnowGivenObs = 0

    if (isCorrect) {
      // P(L | Correct) = (P(L) * (1 - pSlip)) / (P(L) * (1 - pSlip) + (1 - P(L)) * pGuess)
      const numerator = currentProb * (1 - params.pSlip)
      const denominator = numerator + (1 - currentProb) * params.pGuess
      probKnowGivenObs = denominator > 0 ? numerator / denominator : 0
    } else {
      // P(L | Incorrect) = (P(L) * pSlip) / (P(L) * pSlip + (1 - P(L)) * (1 - pGuess))
      const numerator = currentProb * params.pSlip
      const denominator = numerator + (1 - currentProb) * (1 - params.pGuess)
      probKnowGivenObs = denominator > 0 ? numerator / denominator : 0
    }

    // Apply learning transition: P(L_next) = P(L | Obs) + (1 - P(L | Obs)) * pLearn
    const nextProb = probKnowGivenObs + (1 - probKnowGivenObs) * params.pLearn

    return Math.max(0, Math.min(1, nextProb)) // Clamp between 0 and 1
  }

  /**
   * Incrementally updates the user's topic mastery using BKT after a test question is answered.
   */
  public async updateMastery(
    userId: string,
    topicId: string,
    isCorrect: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    txParam?: any
  ): Promise<void> {
    const db = txParam ?? prisma

    try {
      const topic = await db.topic.findUnique({ where: { id: topicId } })
      if (!topic) return

      const mastery = await db.topicPerformance.findUnique({
        where: { userId_topicId: { userId, topicId } },
      })

      // We store the probability in 'accuracy' (0-100 mapped to 0-1)
      const currentProb = mastery ? mastery.accuracy / 100 : DEFAULT_BKT_PARAMS.pInit

      const nextProb = this.calculateNextProbability(currentProb, isCorrect, DEFAULT_BKT_PARAMS)
      const nextAccuracy = nextProb * 100

      const totalAttempts = (mastery?.totalAttempts ?? 0) + 1
      const strengthLevel = this.determineStrengthLevel(nextProb, totalAttempts)

      if (mastery) {
        await db.topicPerformance.update({
          where: { id: mastery.id },
          data: {
            accuracy: nextAccuracy,
            totalAttempts,
            strengthLevel,
            lastAttemptAt: new Date(),
          },
        })
      } else {
        await db.topicPerformance.create({
          data: {
            userId,
            topicId,
            topicName: topic.name,
            accuracy: nextAccuracy,
            totalAttempts,
            strengthLevel,
            lastAttemptAt: new Date(),
          },
        })
      }

      logger.info(
        `[BKT] Updated mastery for user ${userId} topic ${topic.name}: ${currentProb.toFixed(2)} -> ${nextProb.toFixed(2)}`
      )
    } catch (error) {
      logger.error(
        '[BKT] Error updating mastery',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Determine categorical strength based on BKT probability.
   */
  private determineStrengthLevel(prob: number, attempts: number): string {
    if (attempts < 3) return 'developing'
    if (prob >= 0.95) return 'mastered'
    if (prob >= 0.8) return 'proficient'
    if (prob >= 0.6) return 'familiar'
    if (prob >= 0.4) return 'developing'
    return 'weak'
  }
}

export const bktService = new BayesianKnowledgeTracingService()

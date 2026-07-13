import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

interface SM2Result {
  intervalDays: number
  easeFactor: number
  repetitions: number
  nextReview: Date
}

export class SpacedRepetitionEngine {
  public calculateSM2(
    quality: number,
    previousInterval: number,
    previousEaseFactor: number,
    previousRepetitions: number
  ): SM2Result {
    let intervalDays = 0
    let repetitions = previousRepetitions
    let easeFactor = previousEaseFactor

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    if (easeFactor < 1.3) {
      easeFactor = 1.3
    }

    if (quality >= 3) {
      if (repetitions === 0) {
        intervalDays = 1
      } else if (repetitions === 1) {
        intervalDays = 6
      } else {
        intervalDays = Math.round(previousInterval * easeFactor)
      }
      repetitions++
    } else {
      repetitions = 0
      intervalDays = 1
    }

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + intervalDays)

    return {
      intervalDays,
      easeFactor,
      repetitions,
      nextReview,
    }
  }

  public async updateTopicSchedule(
    userId: string,
    topicId: string,
    accuracy: number
  ): Promise<void> {
    try {
      const quality = Math.round(accuracy * 5)

      const existingSchedule = await prisma.spacedRepetitionSchedule.findUnique({
        where: {
          userId_topicId: { userId, topicId },
        },
      })

      let sm2Result: SM2Result

      if (existingSchedule) {
        sm2Result = this.calculateSM2(
          quality,
          existingSchedule.intervalDays,
          existingSchedule.easeFactor,
          existingSchedule.repetitions
        )

        await prisma.spacedRepetitionSchedule.update({
          where: { id: existingSchedule.id },
          data: {
            intervalDays: sm2Result.intervalDays,
            easeFactor: sm2Result.easeFactor,
            repetitions: sm2Result.repetitions,
            nextReview: sm2Result.nextReview,
            lastReview: new Date(),
            lapses: quality < 3 ? existingSchedule.lapses + 1 : existingSchedule.lapses,
          },
        })
      } else {
        sm2Result = this.calculateSM2(quality, 0, 2.5, 0)

        await prisma.spacedRepetitionSchedule.create({
          data: {
            userId,
            topicId,
            intervalDays: sm2Result.intervalDays,
            easeFactor: sm2Result.easeFactor,
            repetitions: sm2Result.repetitions,
            nextReview: sm2Result.nextReview,
            lastReview: new Date(),
            lapses: quality < 3 ? 1 : 0,
          },
        })
      }

      logger.info('Spaced repetition schedule updated', {
        userId,
        topicId,
        quality,
        nextReview: sm2Result.nextReview,
      })
    } catch (error) {
      logger.error('Failed to update spaced repetition schedule', error as Error, {
        userId,
        topicId,
      })
      throw error
    }
  }
}

export const spacedRepetitionEngine = new SpacedRepetitionEngine()

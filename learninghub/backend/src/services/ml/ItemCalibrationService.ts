import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'
import { conductorClient } from './ConductorClient'

export interface CalibrationStats {
  totalScanned: number
  calibratedWithML: number
  calibratedWithHeuristics: number
  skipped: number
}

export class ItemCalibrationService {
  /**
   * Run a daily cron job to calibrate the difficulty (IRT 'b' parameter) of test questions
   * based on historical student performance data, using the Django ML backend.
   */
  async calibrateAllItems(batchSize = 1000): Promise<CalibrationStats> {
    logger.info('[ItemCalibrationService] Starting dynamic IRT item calibration...')
    const stats: CalibrationStats = {
      totalScanned: 0,
      calibratedWithML: 0,
      calibratedWithHeuristics: 0,
      skipped: 0,
    }

    try {
      // Find all questions that have been answered more than a minimum threshold
      const MIN_ANSWERS_FOR_CALIBRATION = 5

      const questionsToCalibrate = await prisma.question.findMany({
        where: {
          test: {
            mode: { in: ['PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE'] },
          },
          TestAttemptAnswer: {
            some: {}, // Only fetch if they have answers
          },
        },
        select: {
          id: true,
          difficulty: true,
        },
        take: batchSize, // Batch processing
      })

      stats.totalScanned = questionsToCalibrate.length

      for (const question of questionsToCalibrate) {
        // Fetch raw response history for this item
        const answers = await prisma.testAttemptAnswer.findMany({
          where: { questionId: question.id, isCorrect: { not: null } },
          select: { isCorrect: true },
        })

        if (answers.length < MIN_ANSWERS_FOR_CALIBRATION) {
          stats.skipped++
          continue
        }

        // Pass to Conductor ML pipeline for Maximum Likelihood Estimation (MLE)
        const irtParams = await conductorClient.calibrateItem(
          question.id,
          answers as Array<{ isCorrect: boolean }>
        )

        if (!irtParams || typeof irtParams.difficulty !== 'number') {
          // Fallback to basic heuristic if ML engine is unreachable or invalid
          const pCorrect =
            answers.filter((a: { isCorrect: boolean | null }) => a.isCorrect).length /
            answers.length
          const empiricalDifficulty = 1.0 - pCorrect
          await this.applyDifficultyShift(question.id, question.difficulty, empiricalDifficulty)
          stats.calibratedWithHeuristics++
          continue
        }

        await this.applyDifficultyShift(question.id, question.difficulty, irtParams.difficulty)
        stats.calibratedWithML++
      }

      logger.info(
        `[ItemCalibrationService] Calibration complete. Scanned: ${stats.totalScanned}, ML: ${stats.calibratedWithML}, Heuristics: ${stats.calibratedWithHeuristics}, Skipped: ${stats.skipped}`
      )
      return stats
    } catch (error) {
      logger.error(
        '[ItemCalibrationService] Calibration failed',
        error instanceof Error ? error : new Error(String(error))
      )
      return stats
    }
  }

  private async applyDifficultyShift(
    questionId: string,
    oldDifficulty: number,
    targetDifficulty: number
  ) {
    const learningRate = 0.1 // Bayesian shift momentum
    const newDifficulty = oldDifficulty + learningRate * (targetDifficulty - oldDifficulty)

    // Only update if shift is meaningful (save DB writes)
    if (Math.abs(newDifficulty - oldDifficulty) > 0.02) {
      await prisma.question.update({
        where: { id: questionId },
        data: { difficulty: Math.max(0.1, Math.min(1.0, newDifficulty)) },
      })
    }
  }
}

export const itemCalibrationService = new ItemCalibrationService()

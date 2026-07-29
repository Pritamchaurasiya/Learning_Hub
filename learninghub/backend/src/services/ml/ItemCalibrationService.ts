import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'
import { conductorClient } from './ConductorClient'

export interface CalibrationStats {
  totalScanned: number
  calibratedWithML: number
  calibratedWithHeuristics: number
  skipped: number
}

const MIN_ANSWERS_FOR_CALIBRATION = 5

export class ItemCalibrationService {
  /**
   * Run a daily cron job to calibrate the difficulty (IRT 'b' parameter) of test questions
   * based on historical student performance data, using the Django ML backend.
   *
   * Optimization: Uses a single aggregation query to batch-load answer counts,
   * avoiding the previous N+1 query pattern that issued one SELECT per question.
   * Processes in cursor-paginated batches to handle arbitrarily large question sets.
   */
  async calibrateAllItems(batchSize = 500): Promise<CalibrationStats> {
    logger.info('[ItemCalibrationService] Starting dynamic IRT item calibration...')
    const stats: CalibrationStats = {
      totalScanned: 0,
      calibratedWithML: 0,
      calibratedWithHeuristics: 0,
      skipped: 0,
    }

    try {
      let cursor: string | undefined
      let hasMore = true

      while (hasMore) {
        // Fetch a page of questions that belong to calibratable test modes,
        // eagerly loading the answer count to avoid N+1.
        const questionsPage = await prisma.question.findMany({
          where: {
            test: {
              mode: { in: ['PRACTICE', 'MOCK', 'TIMED_CHALLENGE', 'ADAPTIVE'] },
            },
            TestAttemptAnswer: {
              some: {}, // Only include questions that have at least one answer
            },
          },
          select: {
            id: true,
            difficulty: true,
            _count: {
              select: { TestAttemptAnswer: { where: { isCorrect: { not: null } } } },
            },
          },
          take: batchSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: 'asc' },
        })

        if (questionsPage.length === 0) {
          hasMore = false
          break
        }

        cursor = questionsPage[questionsPage.length - 1].id
        hasMore = questionsPage.length === batchSize
        stats.totalScanned += questionsPage.length

        // Filter to only questions with enough answers (avoids unnecessary DB/ML calls)
        type QuestionItem = {
          id: string
          difficulty: number
          _count: { TestAttemptAnswer: number }
        }
        const qualifiedQuestions = (questionsPage as QuestionItem[]).filter(
          q => q._count.TestAttemptAnswer >= MIN_ANSWERS_FOR_CALIBRATION
        )
        const skippedCount = questionsPage.length - qualifiedQuestions.length
        stats.skipped += skippedCount

        // Process qualified questions — fetch their full answer history in parallel batches
        const PARALLEL_CHUNK = 10
        for (let i = 0; i < qualifiedQuestions.length; i += PARALLEL_CHUNK) {
          const chunk = qualifiedQuestions.slice(i, i + PARALLEL_CHUNK)
          await Promise.all(
            chunk.map((q: QuestionItem) => this.calibrateSingleItem(q.id, q.difficulty, stats))
          )
        }
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

  /**
   * Calibrate a single question item — fetch answers, call ML, apply shift.
   */
  private async calibrateSingleItem(
    questionId: string,
    currentDifficulty: number,
    stats: CalibrationStats
  ): Promise<void> {
    try {
      const answers = await prisma.testAttemptAnswer.findMany({
        where: { questionId, isCorrect: { not: null } },
        select: { isCorrect: true },
      })

      if (answers.length < MIN_ANSWERS_FOR_CALIBRATION) {
        stats.skipped++
        return
      }

      // Pass to Conductor ML pipeline for Maximum Likelihood Estimation (MLE)
      const irtParams = await conductorClient.calibrateItem(
        questionId,
        answers as Array<{ isCorrect: boolean }>
      )

      if (!irtParams || typeof irtParams.difficulty !== 'number') {
        // Fallback to basic heuristic if ML engine is unreachable or invalid
        const pCorrect =
          answers.filter((a: { isCorrect: boolean | null }) => a.isCorrect).length / answers.length
        const empiricalDifficulty = 1.0 - pCorrect
        await this.applyDifficultyShift(questionId, currentDifficulty, empiricalDifficulty)
        stats.calibratedWithHeuristics++
        return
      }

      await this.applyDifficultyShift(questionId, currentDifficulty, irtParams.difficulty)
      stats.calibratedWithML++
    } catch (error) {
      logger.error(
        `[ItemCalibrationService] Failed to calibrate question ${questionId}`,
        error instanceof Error ? error : new Error(String(error))
      )
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

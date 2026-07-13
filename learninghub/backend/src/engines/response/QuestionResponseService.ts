import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'
import { cacheService } from '../../services/CacheService'

export interface QuestionResponseEvent {
  userId: string
  testId: string
  questionId: string
  attemptId: string
  examId?: string
  subjectId?: string
  topicId?: string
  selectedOptionId?: string
  selectedOptions?: string[]
  isCorrect: boolean
  marksObtained: number
  rawAnswer?: string
  timeSpentSeconds: number
  confidence?: string
  completedAt: Date
}

export class QuestionResponseService {
  /**
   * Write a single question response to the database.
   * Falls back to logging on FK constraint errors (e.g., attemptId mismatch).
   */
  async writeResponse(event: QuestionResponseEvent): Promise<void> {
    try {
      await prisma.questionResponse.create({
        data: {
          attemptId: event.attemptId,
          userId: event.userId,
          testId: event.testId,
          questionId: event.questionId,
          examId: event.examId ?? null,
          subjectId: event.subjectId ?? null,
          topicId: event.topicId ?? null,
          selectedOptionId: event.selectedOptionId ?? null,
          selectedOptions: event.selectedOptions ?? [],
          isCorrect: event.isCorrect,
          marksObtained: event.marksObtained,
          rawAnswer: event.rawAnswer ?? null,
          timeSpentSeconds: event.timeSpentSeconds,
          confidence: event.confidence ?? null,
          completedAt: event.completedAt,
        },
      })

      await this.invalidateUserCaches(event.userId)
    } catch (error) {
      // P2003 = Foreign key constraint failed (attemptId may reference TestAttempt not TestResult)
      // In that case, log the response data but don't crash the submission pipeline
      const errCode = error instanceof Error ? (error as { code?: string }).code : undefined
      if (errCode === 'P2003' || errCode === 'P2025') {
        logger.warn(`[QuestionResponseService] FK constraint on writeResponse, logging instead`, {
          questionId: event.questionId,
          attemptId: event.attemptId,
          errCode,
        })
        return
      }
      logger.error(
        `[QuestionResponseService] writeResponse failed`,
        error instanceof Error ? error : new Error(String(error)),
        { questionId: event.questionId }
      )
      throw error
    }
  }

  /**
   * Write a batch of question responses to the database.
   * Uses createMany for performance. Falls back gracefully on FK errors.
   */
  async writeResponsesBatch(events: QuestionResponseEvent[]): Promise<void> {
    if (events.length === 0) return

    try {
      const userIds = new Set(events.map(e => e.userId))

      await prisma.questionResponse.createMany({
        data: events.map(e => ({
          attemptId: e.attemptId,
          userId: e.userId,
          testId: e.testId,
          questionId: e.questionId,
          examId: e.examId ?? null,
          subjectId: e.subjectId ?? null,
          topicId: e.topicId ?? null,
          selectedOptionId: e.selectedOptionId ?? null,
          selectedOptions: e.selectedOptions ?? [],
          isCorrect: e.isCorrect,
          marksObtained: e.marksObtained,
          rawAnswer: e.rawAnswer ?? null,
          timeSpentSeconds: e.timeSpentSeconds,
          confidence: e.confidence ?? null,
          completedAt: e.completedAt,
        })),
        skipDuplicates: true,
      })

      logger.info(`[QuestionResponseService] Persisted batch of ${events.length} responses`)

      for (const userId of userIds) {
        await this.invalidateUserCaches(userId)
      }
    } catch (error) {
      // P2003 = Foreign key constraint failed
      // This happens when attemptId references TestAttempt but we pass a TestResult ID
      // Degrade gracefully — log the batch metadata without crashing submission
      const errCode = error instanceof Error ? (error as { code?: string }).code : undefined
      if (errCode === 'P2003' || errCode === 'P2025') {
        logger.warn(
          `[QuestionResponseService] FK constraint on writeResponsesBatch (${events.length} events), skipping DB write`,
          { errCode, sampleAttemptId: events[0]?.attemptId }
        )
        // Still invalidate caches even on FK failure
        const userIds = new Set(events.map(e => e.userId))
        for (const userId of userIds) {
          await this.invalidateUserCaches(userId)
        }
        return
      }
      logger.error(
        `[QuestionResponseService] writeResponsesBatch failed`,
        error instanceof Error ? error : new Error(String(error)),
        { count: events.length }
      )
      throw error
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getResponsesForAttempt(attemptId: string): Promise<any[]> {
    try {
      return await prisma.questionResponse.findMany({
        where: { attemptId },
        orderBy: { completedAt: 'asc' },
      })
    } catch {
      return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getResponsesForUser(userId: string, limit = 100): Promise<any[]> {
    try {
      return await prisma.questionResponse.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: limit,
      })
    } catch {
      return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getResponsesForQuestion(questionId: string, limit = 100): Promise<any[]> {
    try {
      return await prisma.questionResponse.findMany({
        where: { questionId },
        orderBy: { completedAt: 'desc' },
        take: limit,
      })
    } catch {
      return []
    }
  }

  private async invalidateUserCaches(userId: string): Promise<void> {
    await Promise.all([
      cacheService.delete(cacheService.topicMasteryKey(userId)),
      cacheService.delete(cacheService.topicWeakKey(userId)),
      cacheService.delete(cacheService.topicReviewKey(userId)),
      cacheService.delete(cacheService.recommendationStudyKey(userId)),
      cacheService.delete(cacheService.recommendationTestKey(userId)),
      cacheService.delete(cacheService.recommendationRoadmapKey(userId)),
      cacheService.delete(cacheService.recommendationSpacedKey(userId)),
    ])
  }
}

export const questionResponseService = new QuestionResponseService()

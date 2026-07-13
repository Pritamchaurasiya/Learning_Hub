import { cacheService } from './CacheService'
import logger from '../utils/logger'

export interface DraftAnswer {
  questionId: string
  selectedOptionId: string
  timeSpentMs: number
}

export interface ActiveTestSession {
  userId: string
  testId: string
  startTime: number
  lastActive: number
  answers: Record<string, DraftAnswer>
}

export class TestSessionService {
  private readonly SESSION_TTL = 60 * 60 * 24 // 24 hours

  /**
   * Syncs heartbeat from the frontend, caching current test progress in Redis.
   */
  async syncHeartbeat(
    userId: string,
    testId: string,
    draftAnswers: Record<string, DraftAnswer>
  ): Promise<void> {
    try {
      const key = `test_session:${userId}:${testId}`
      const existing = await cacheService.get<ActiveTestSession>(key)
      const session: ActiveTestSession = {
        userId,
        testId,
        startTime: existing?.startTime ?? Date.now(),
        lastActive: Date.now(),
        answers: draftAnswers,
      }

      await cacheService.set(key, session, this.SESSION_TTL)
      logger.debug(`[TestSessionService] Heartbeat synced for User ${userId} on Test ${testId}`)
    } catch (error) {
      logger.error(
        '[TestSessionService] Failed to sync heartbeat',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  /**
   * Retrieves an in-flight session to resume a test.
   */
  async getActiveSession(userId: string, testId: string): Promise<ActiveTestSession | null> {
    try {
      const key = `test_session:${userId}:${testId}`
      const session = await cacheService.get<ActiveTestSession>(key)
      return session
    } catch (error) {
      logger.error(
        '[TestSessionService] Failed to get active session',
        error instanceof Error ? error : new Error(String(error))
      )
      return null
    }
  }

  /**
   * Clears the active session from cache once the test is formally submitted.
   */
  async clearSession(userId: string, testId: string): Promise<void> {
    try {
      const key = `test_session:${userId}:${testId}`
      await cacheService.delete(key)
      logger.info(
        `[TestSessionService] Cleared active session for User ${userId} on Test ${testId}`
      )
    } catch (error) {
      logger.error(
        '[TestSessionService] Failed to clear session',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
}

export const testSessionService = new TestSessionService()

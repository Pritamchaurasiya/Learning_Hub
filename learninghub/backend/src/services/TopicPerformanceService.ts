/**
 * TopicPerformanceService
 *
 * Single source of truth for topic-level analytics.
 * Consolidates the duplicate topic-performance update logic that was
 * previously spread across TestScoringService and TestEngineService.
 *
 * Responsibilities:
 *  - Update topic performance after test/practice answers
 *  - Calculate and maintain strength levels
 *  - Provide topic mastery maps for analytics & recommendations
 *  - Detect weak and strong areas
 */

import { prisma } from '../prismaClient'
import logger from '../utils/logger'
import { cacheService } from './CacheService'

// ─── Types ───────────────────────────────────────────────────────────────────

export type StrengthLevel = 'weak' | 'developing' | 'proficient' | 'mastered' | 'unknown'

export interface TopicPerformanceData {
  topicName: string
  subjectName?: string
  totalAttempts: number
  correctAnswers: number
  accuracy: number
  avgTimeSeconds: number
  strengthLevel: StrengthLevel
  lastAttemptAt: Date | null
}

export interface TopicMasteryMap {
  topics: TopicPerformanceData[]
  weakTopics: TopicPerformanceData[]
  strongTopics: TopicPerformanceData[]
  overallAccuracy: number
  totalTopics: number
}

export interface QuestionResult {
  questionId: string
  topicName: string
  subjectName?: string
  isCorrect: boolean
  timeSpentSeconds?: number
}

// ─── Strength Level Calculation ──────────────────────────────────────────────

/**
 * Determines strength level based on accuracy percentage and minimum attempts.
 * Requires at least 3 attempts to move beyond 'developing'.
 */
export function calculateStrengthLevel(accuracy: number, totalAttempts: number): StrengthLevel {
  if (!Number.isFinite(totalAttempts) || totalAttempts <= 0) return 'unknown'
  if (!Number.isFinite(accuracy)) return 'unknown'
  if (totalAttempts < 3) return 'developing'
  if (accuracy >= 80) return 'mastered'
  if (accuracy >= 60) return 'proficient'
  if (accuracy >= 40) return 'developing'
  return 'weak'
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class TopicPerformanceService {
  private invalidateTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly DEBOUNCE_MS = 30_000

  private async invalidateCache(userId: string) {
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

  /**
   * Debounced cache invalidation — batches rapid per-answer updates into a single
   * invalidation after DEBOUNCE_MS of inactivity.
   *
   * NOTE: This uses in-memory timers, which means it only works correctly for
   * single-node deployments. For multi-node scaling, replace this with a
   * Redis-backed debounce (e.g., SET with NX + TTL and a background poller).
   */
  private scheduleDebouncedInvalidation(userId: string) {
    const existing = this.invalidateTimers.get(userId)
    if (existing) clearTimeout(existing)
    this.invalidateTimers.set(
      userId,
      setTimeout(() => {
        this.invalidateTimers.delete(userId)
        this.invalidateCache(userId).catch(err => {
          logger.error(
            `[TopicPerformanceService] Debounced cache invalidation failed for user ${userId}`,
            err instanceof Error ? err : new Error(String(err))
          )
        })
      }, this.DEBOUNCE_MS)
    )
  }

  /**
   * Flush all pending debounced cache invalidations immediately.
   * Call this during graceful shutdown to prevent stale caches after redeployment.
   */
  async flushPendingInvalidations(): Promise<void> {
    const userIds = Array.from(this.invalidateTimers.keys())
    for (const [, timer] of this.invalidateTimers) {
      clearTimeout(timer)
    }
    this.invalidateTimers.clear()
    await Promise.allSettled(userIds.map(uid => this.invalidateCache(uid)))
  }

  /**
   * Clear all pending timers without executing them. For testing cleanup.
   */
  clearAllTimers(): void {
    for (const [, timer] of this.invalidateTimers) {
      clearTimeout(timer)
    }
    this.invalidateTimers.clear()
  }

  /**
   * Update topic performance for a single question answer.
   * Used by practice mode (TestEngineService) for instant feedback.
   * Cache invalidation is debounced to avoid stampeding Redis on every answer.
   */
  async updateForSingleAnswer(
    userId: string,
    topicName: string,
    isCorrect: boolean,
    options?: {
      subjectName?: string
      timeSpentSeconds?: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx?: any // Prisma transaction client
    }
  ): Promise<void> {
    const client = options?.tx ?? prisma

    try {
      const existing = await client.topicPerformance.findUnique({
        where: { userId_topicId: { userId, topicId: topicName } },
      })

      const newCorrect = (existing?.correctAnswers ?? 0) + (isCorrect ? 1 : 0)
      const newTotal = (existing?.totalAttempts ?? 0) + 1
      const newAccuracy = Math.round((newCorrect / newTotal) * 100 * 100) / 100
      const strengthLevel = calculateStrengthLevel(newAccuracy, newTotal)

      // Calculate running average time
      const prevAvgTime = existing?.avgTimeSeconds ?? 0
      const prevTotal = existing?.totalAttempts ?? 0
      const timeSpent = options?.timeSpentSeconds ?? 0
      const newAvgTime =
        prevTotal > 0 ? (prevAvgTime * prevTotal + timeSpent) / newTotal : timeSpent

      if (existing) {
        await client.topicPerformance.update({
          where: { id: existing.id },
          data: {
            totalAttempts: newTotal,
            correctAnswers: newCorrect,
            accuracy: newAccuracy,
            avgTimeSeconds: Math.round(newAvgTime * 100) / 100,
            strengthLevel,
            subjectName: options?.subjectName ?? existing.subjectName,
            lastAttemptAt: new Date(),
          },
        })
      } else {
        await client.topicPerformance.create({
          data: {
            userId,
            topicId: topicName,
            topicName,
            subjectName: options?.subjectName,
            totalAttempts: 1,
            correctAnswers: isCorrect ? 1 : 0,
            accuracy: isCorrect ? 100 : 0,
            avgTimeSeconds: timeSpent,
            strengthLevel,
            lastAttemptAt: new Date(),
          },
        })
      }

      // Debounce cache invalidation — batches per-answer updates into one invalidation
      this.scheduleDebouncedInvalidation(userId)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.error(
        `[TopicPerformanceService] updateForSingleAnswer failed: userId=${userId} topicName=${topicName} error=${errMsg}`
      )
    }
  }

  /**
   * Batch update topic performance after a full test submission.
   * More efficient than updating one-by-one — groups by topic first.
   * Used by TestScoringService after scoring a complete test.
   */
  async updateForTestResults(userId: string, results: QuestionResult[]): Promise<void> {
    // Group results by topic
    const topicMap = new Map<
      string,
      { correct: number; total: number; subjectName?: string; totalTime: number }
    >()

    for (const result of results) {
      const topicName = result.topicName || 'General'
      const existing = topicMap.get(topicName) ?? {
        correct: 0,
        total: 0,
        subjectName: result.subjectName,
        totalTime: 0,
      }
      existing.total++
      if (result.isCorrect) existing.correct++
      existing.totalTime += result.timeSpentSeconds ?? 0
      topicMap.set(topicName, existing)
    }

    try {
      const topicNames = Array.from(topicMap.keys())

      // Batch fetch existing topics
      const existingTopics = await prisma.topicPerformance.findMany({
        where: {
          userId,
          topicName: { in: topicNames },
        },
      })

      const existingTopicsMap = new Map<string, any>(existingTopics.map((t: any) => [t.topicName, t]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const operations: any[] = []

      for (const [topicName, stats] of topicMap.entries()) {
        const existing = existingTopicsMap.get(topicName)

        if (existing) {
          const newTotal = existing.totalAttempts + stats.total
          const newCorrect = existing.correctAnswers + stats.correct
          const newAccuracy = newTotal > 0 ? (newCorrect / newTotal) * 100 : 0
          const roundedAccuracy = Math.round(newAccuracy * 100) / 100
          const strengthLevel = calculateStrengthLevel(roundedAccuracy, newTotal)

          // Weighted average time
          const prevTotalTime = existing.avgTimeSeconds * existing.totalAttempts
          const newAvgTime = newTotal > 0 ? (prevTotalTime + stats.totalTime) / newTotal : 0

          operations.push(
            prisma.topicPerformance.update({
              where: { id: existing.id },
              data: {
                totalAttempts: newTotal,
                correctAnswers: newCorrect,
                accuracy: roundedAccuracy,
                avgTimeSeconds: Math.round(newAvgTime * 100) / 100,
                strengthLevel,
                subjectName: stats.subjectName ?? existing.subjectName,
                lastAttemptAt: new Date(),
              },
            })
          )
        } else {
          const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
          const roundedAccuracy = Math.round(accuracy * 100) / 100
          const strengthLevel = calculateStrengthLevel(roundedAccuracy, stats.total)
          const avgTime = stats.total > 0 ? stats.totalTime / stats.total : 0

          operations.push(
            prisma.topicPerformance.create({
              data: {
                userId,
                topicId: topicName,
                topicName,
                subjectName: stats.subjectName,
                totalAttempts: stats.total,
                correctAnswers: stats.correct,
                accuracy: roundedAccuracy,
                avgTimeSeconds: Math.round(avgTime * 100) / 100,
                strengthLevel,
                lastAttemptAt: new Date(),
              },
            })
          )
        }
      }

      // Execute all updates/creates in a single transaction
      if (operations.length > 0) {
        await prisma.$transaction(operations)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.error(
        `[TopicPerformanceService] updateForTestResults failed for batch update: userId=${userId} error=${errMsg}`
      )
    }

    await this.invalidateCache(userId)
  }

  /**
   * Get full topic mastery map for a user.
   * Used by UserAnalyticsService, RecommendationService, and frontend analytics.
   */
  async getTopicMasteryMap(userId: string): Promise<TopicMasteryMap> {
    return cacheService.getOrSet(
      cacheService.topicMasteryKey(userId),
      async () => {
        const userPref = await prisma.userExamPreference.findUnique({
          where: { userId },
          include: { subjects: true },
        })

        const activeSubjectNames = userPref?.subjects?.map((s: { name: string }) => s.name) ?? []

        const topics = await prisma.topicPerformance.findMany({
          where: {
            userId,
            ...(activeSubjectNames.length > 0 && {
              subjectName: { in: activeSubjectNames },
            }),
          },
          orderBy: { accuracy: 'asc' },
        })

        const topicData: TopicPerformanceData[] = topics.map((t: any) => ({
          topicName: t.topicName ?? 'Unknown',
          subjectName: t.subjectName ?? undefined,
          totalAttempts: t.totalAttempts,
          correctAnswers: t.correctAnswers,
          accuracy: t.accuracy,
          avgTimeSeconds: t.avgTimeSeconds,
          strengthLevel: t.strengthLevel as StrengthLevel,
          lastAttemptAt: t.lastAttemptAt,
        }))

        const weakTopics = topicData.filter((t: TopicPerformanceData) => t.strengthLevel === 'weak' && t.totalAttempts >= 3)
        const strongTopics = topicData.filter(
          (t: TopicPerformanceData) =>
            (t.strengthLevel === 'mastered' || t.strengthLevel === 'proficient') &&
            t.totalAttempts >= 3
        )

        const totalAttempts = topicData.reduce((sum: number, t: TopicPerformanceData) => sum + t.totalAttempts, 0)
        const totalCorrect = topicData.reduce((sum: number, t: TopicPerformanceData) => sum + t.correctAnswers, 0)
        const overallAccuracy =
          totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100 * 100) / 100 : 0

        return {
          topics: topicData,
          weakTopics,
          strongTopics,
          overallAccuracy,
          totalTopics: topicData.length,
        }
      },
      300 // 5 minutes cache
    )
  }

  /**
   * Get weak topics — topics below 60% accuracy with at least 3 attempts.
   * Sorted by accuracy ascending (weakest first).
   */
  async getWeakTopics(userId: string, limit: number = 10): Promise<TopicPerformanceData[]> {
    return cacheService.getOrSet(
      cacheService.topicWeakKey(userId),
      async () => {
        const userPref = await prisma.userExamPreference.findUnique({
          where: { userId },
          include: { subjects: true },
        })

        const activeSubjectNames = userPref?.subjects?.map((s: { name: string }) => s.name) ?? []

        const topics = await prisma.topicPerformance.findMany({
          where: {
            userId,
            accuracy: { lt: 60 },
            totalAttempts: { gte: 3 },
            ...(activeSubjectNames.length > 0 && {
              subjectName: { in: activeSubjectNames },
            }),
          },
          orderBy: { accuracy: 'asc' },
          take: limit,
        })

        return topics.map((t: any) => ({
          topicName: t.topicName ?? 'Unknown',
          subjectName: t.subjectName ?? undefined,
          totalAttempts: t.totalAttempts,
          correctAnswers: t.correctAnswers,
          accuracy: t.accuracy,
          avgTimeSeconds: t.avgTimeSeconds,
          strengthLevel: t.strengthLevel as StrengthLevel,
          lastAttemptAt: t.lastAttemptAt,
        }))
      },
      300
    )
  }

  /**
   * Get topics due for review — topics not practiced in > N days.
   * For spaced repetition recommendations.
   */
  async getTopicsDueForReview(
    userId: string,
    daysSinceLastAttempt: number = 7,
    limit: number = 10
  ): Promise<TopicPerformanceData[]> {
    return cacheService.getOrSet(
      cacheService.topicReviewKey(userId),
      async () => {
        const cutoffDate = new Date(Date.now() - daysSinceLastAttempt * 24 * 60 * 60 * 1000)

        const userPref = await prisma.userExamPreference.findUnique({
          where: { userId },
          include: { subjects: true },
        })

        const activeSubjectNames = userPref?.subjects?.map((s: { name: string }) => s.name) ?? []

        const topics = await prisma.topicPerformance.findMany({
          where: {
            userId,
            totalAttempts: { gte: 1 },
            lastAttemptAt: { lt: cutoffDate },
            ...(activeSubjectNames.length > 0 && {
              subjectName: { in: activeSubjectNames },
            }),
          },
          orderBy: [
            { accuracy: 'asc' }, // Weakest first
            { lastAttemptAt: 'asc' }, // Oldest first
          ],
          take: limit,
        })

        return topics.map((t: any) => ({
          topicName: t.topicName ?? 'Unknown',
          subjectName: t.subjectName ?? undefined,
          totalAttempts: t.totalAttempts,
          correctAnswers: t.correctAnswers,
          accuracy: t.accuracy,
          avgTimeSeconds: t.avgTimeSeconds,
          strengthLevel: t.strengthLevel as StrengthLevel,
          lastAttemptAt: t.lastAttemptAt,
        }))
      },
      300
    )
  }

  /**
   * Recalculate all strength levels for a user.
   * Useful as a maintenance/migration task.
   */
  async recalculateStrengthLevels(userId: string): Promise<number> {
    const topics = await prisma.topicPerformance.findMany({
      where: { userId },
    })

    let updated = 0
    for (const topic of topics) {
      const newLevel = calculateStrengthLevel(topic.accuracy, topic.totalAttempts)
      if (newLevel !== topic.strengthLevel) {
        await prisma.topicPerformance.update({
          where: { id: topic.id },
          data: { strengthLevel: newLevel },
        })
        updated++
      }
    }

    if (updated > 0) {
      await this.invalidateCache(userId)
      logger.info(
        `[TopicPerformanceService] Recalculated ${updated} strength levels for user ${userId}`
      )
    }

    return updated
  }
}

export const topicPerformanceService = new TopicPerformanceService()

import { prisma } from '../../prismaClient'
import { AreaSnapshotType, Prisma } from '@prisma/client'
import logger from '../../utils/logger'
import { cacheService } from '../../services/CacheService'

function _computeMasteryScore(
  accuracy: number,
  totalAttempts: number,
  avgTimeSeconds: number,
  consistencyScore: number,
  recencyScore: number
): number {
  const difficultyAdjustedAccuracy = accuracy
  const masteryScore =
    0.45 * difficultyAdjustedAccuracy +
    0.2 * recencyScore +
    0.15 * consistencyScore +
    0.1 * Math.max(0, 100 - avgTimeSeconds) +
    0.1 * 100
  return Math.round(Math.min(100, Math.max(0, masteryScore)) * 100) / 100
}

function _computeRecencyScore(lastAttemptAt: Date | null): number {
  if (!lastAttemptAt) return 0
  const daysSince = (Date.now() - lastAttemptAt.getTime()) / (24 * 60 * 60 * 1000)
  return Math.max(0, Math.round((1 - Math.min(daysSince, 30) / 30) * 100))
}

function _computeConsistencyScore(correctAnswers: number, totalAttempts: number): number {
  if (totalAttempts === 0) return 0
  const accuracy = correctAnswers / totalAttempts
  const variance = totalAttempts < 3 ? 50 : 0
  return Math.round((1 - variance / 100) * accuracy * 100)
}

function strengthLevelFromAccuracy(accuracy: number, totalAttempts: number): string {
  if (totalAttempts === 0) return 'unknown'
  if (totalAttempts < 3) return 'developing'
  if (accuracy >= 80) return 'mastered'
  if (accuracy >= 60) return 'proficient'
  if (accuracy >= 40) return 'developing'
  return 'weak'
}

export class MasteryAnalyticsService {
  async updateTopicMasteryFromResponses(
    userId: string,
    responses: Array<{
      topicId: string | null
      topicName: string | null
      subjectId: string | null
      subjectName: string | null
      isCorrect: boolean
      timeSpentSeconds: number
      completedAt: Date
    }>
  ): Promise<void> {
    try {
      const { bktService } = await import('./BayesianKnowledgeTracingService')
      const { jobQueueService } = await import('../../services/JobQueueService')

      // Phase 1: Sequential BKT Updates
      const sortedResponses = [...responses].sort(
        (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
      )

      for (const r of sortedResponses) {
        const topicId = r.topicId ?? r.topicName ?? 'unknown'
        let retryCount = 0
        let success = false

        while (retryCount < 3 && !success) {
          try {
            await prisma.$transaction(
              async (tx: any) => {
                const existing = await tx.topicPerformance.findUnique({
                  where: { userId_topicId: { userId, topicId } },
                })

                const prevTotal = existing?.totalAttempts ?? 0
                const newTotal = prevTotal + 1
                const newCorrect = (existing?.correctAnswers ?? 0) + (r.isCorrect ? 1 : 0)
                const avgTime =
                  newTotal > 0
                    ? ((existing?.avgTimeSeconds ?? 0) * prevTotal + r.timeSpentSeconds) / newTotal
                    : 0

                // BKT Math: probability derived from accuracy or initialized
                const currentProb = existing ? existing.accuracy / 100 : 0.1 // pInit
                const nextProb = bktService.calculateNextProbability(currentProb, r.isCorrect)
                const nextAccuracy = nextProb * 100

                let strengthLevel = 'developing'
                if (newTotal < 3) strengthLevel = 'developing'
                else if (nextProb >= 0.9) strengthLevel = 'mastered'
                else if (nextProb >= 0.7) strengthLevel = 'proficient'
                else if (nextProb >= 0.45) strengthLevel = 'familiar'
                else if (nextProb >= 0.25) strengthLevel = 'developing'
                else strengthLevel = 'weak'

                if (existing) {
                  await tx.topicPerformance.update({
                    where: { id: existing.id },
                    data: {
                      totalAttempts: newTotal,
                      correctAnswers: newCorrect,
                      accuracy: nextAccuracy, // Storing BKT prob as accuracy
                      avgTimeSeconds: Math.round(avgTime * 100) / 100,
                      strengthLevel,
                      lastAttemptAt: r.completedAt,
                      subjectName: r.subjectName ?? existing.subjectName,
                    },
                  })
                } else {
                  await tx.topicPerformance.create({
                    data: {
                      userId,
                      topicId,
                      topicName: r.topicName ?? 'General',
                      subjectName: r.subjectName,
                      accuracy: nextAccuracy,
                      totalAttempts: newTotal,
                      correctAnswers: newCorrect,
                      avgTimeSeconds: Math.round(avgTime * 100) / 100,
                      strengthLevel,
                      lastAttemptAt: r.completedAt,
                    },
                  })
                }

                const prevMasteryScore = existing?.accuracy ?? 0
                const masteryDelta = nextAccuracy - prevMasteryScore

                // Dispatch ML jobs in the background (post-transaction or floating promise)
                void jobQueueService.addAIJob({
                  userId,
                  operation: 'KNOWLEDGE_GRAPH',
                  params: {
                    topicName: r.topicName ?? 'unknown',
                    masteryScore: nextAccuracy,
                    masteryDelta,
                  },
                })

                void jobQueueService.addAIJob({
                  userId,
                  operation: 'SPACED_REPETITION',
                  params: {
                    topicId,
                    accuracy: r.isCorrect ? 1 : 0,
                  },
                })
              },
              { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
            )
            success = true
          } catch (e) {
            retryCount++
            if (retryCount >= 3) {
              logger.error(
                `Failed to execute BKT sequential update for topic ${topicId}`,
                e instanceof Error ? e : new Error(String(e))
              )
            }
            await new Promise(res => setTimeout(res, 100 * Math.pow(2, retryCount)))
          }
        }
      }

      // Phase 2: Supplementary Updates (avgTimeSeconds, subjectName only)
      // Phase 1 already handled totalAttempts, correctAnswers, accuracy (BKT), and strengthLevel.
      // Phase 2 must NOT re-increment counts or overwrite BKT-derived accuracy.
      const grouped = new Map<
        string,
        {
          totalTime: number
          lastAttemptAt: Date
          subjectName?: string
          topicId?: string
          responseCount: number
        }
      >()
      for (const r of responses) {
        const key = r.topicId ?? r.topicName ?? 'unknown'
        const existing = grouped.get(key) ?? {
          topicId: r.topicId ?? 'unknown',
          totalTime: 0,
          lastAttemptAt: r.completedAt,
          subjectName: r.subjectName ?? undefined,
          responseCount: 0,
        }
        existing.responseCount++
        existing.totalTime += r.timeSpentSeconds
        if (r.completedAt > existing.lastAttemptAt) existing.lastAttemptAt = r.completedAt
        grouped.set(key, existing)
      }

      for (const [_topicId, stats] of grouped.entries()) {
        let retryCount = 0
        let success = false
        while (retryCount < 3 && !success) {
          try {
            await prisma.$transaction(
              async (tx: any) => {
                const record = await tx.topicPerformance.findUnique({
                  where: { userId_topicId: { userId, topicId: stats.topicId || 'unknown' } },
                })
                if (!record) return // Phase 1 should have created it; skip if missing

                // Compute weighted average time from existing + new responses
                const prevTotal = Math.max(0, record.totalAttempts - stats.responseCount)
                const avgTime =
                  record.totalAttempts > 0
                    ? ((record.avgTimeSeconds ?? 0) * prevTotal + stats.totalTime) /
                      record.totalAttempts
                    : 0

                await tx.topicPerformance.update({
                  where: { id: record.id },
                  data: {
                    avgTimeSeconds: Math.round(avgTime * 100) / 100,
                    subjectName: stats.subjectName ?? record.subjectName,
                  },
                })
              },
              { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
            )
            success = true
          } catch {
            retryCount++
            if (retryCount >= 3) {
              logger.warn(
                `[MasteryAnalytics] Topic mastery supplementary update failed after 3 retries for ${userId}/${stats.topicId}`
              )
            }
          }
        }
      }

      await cacheService.delete(cacheService.topicMasteryKey(userId))
      await cacheService.delete(cacheService.topicWeakKey(userId))
      await cacheService.delete(cacheService.topicReviewKey(userId))
      await cacheService.delete(`topic_performance:${userId}`)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.error(
        `[MasteryAnalytics] updateTopicMasteryFromResponses failed: userId=${userId} error=${errMsg}`
      )
    }
  }

  async updateDailyStatsFromResponses(
    userId: string,
    responses: Array<{ isCorrect: boolean; timeSpentSeconds: number; completedAt: Date }>
  ): Promise<void> {
    try {
      const today = responses[0]?.completedAt ?? new Date()
      const dateStr = today.toISOString().split('T')[0]
      let retryCount = 0
      let success = false
      while (retryCount < 3 && !success) {
        try {
          await prisma.$transaction(
            async (tx: any) => {
              const existing = await tx.userDailyStats.findUnique({
                where: { userId_date: { userId, date: new Date(dateStr) } },
              })
              const questionsAnswered = responses.length
              const correctAnswers = responses.filter(r => r.isCorrect).length
              const studyTimeMinutes = Math.round(
                responses.reduce((sum, r) => sum + r.timeSpentSeconds, 0) / 60
              )
              const avgAccuracy =
                questionsAnswered > 0
                  ? Math.round((correctAnswers / questionsAnswered) * 100 * 100) / 100
                  : 0

              if (existing) {
                const newTotal = existing.questionsAnswered + questionsAnswered
                const newCorrect = existing.correctAnswers + correctAnswers
                await tx.userDailyStats.update({
                  where: { id: existing.id },
                  data: {
                    questionsAnswered: newTotal,
                    correctAnswers: newCorrect,
                    studyTimeMinutes: existing.studyTimeMinutes + studyTimeMinutes,
                    avgAccuracy:
                      newTotal > 0
                        ? Math.round((newCorrect / newTotal) * 100 * 100) / 100
                        : existing.avgAccuracy,
                  },
                })
              } else {
                await tx.userDailyStats.create({
                  data: {
                    userId,
                    date: new Date(dateStr),
                    questionsAnswered,
                    correctAnswers,
                    studyTimeMinutes,
                    avgAccuracy,
                  },
                })
              }
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
          )
          success = true
        } catch (txErr) {
          retryCount++
          if (retryCount >= 3) {
            logger.warn(
              `[MasteryAnalytics] Daily stats update failed after 3 retries for ${userId}: ${txErr instanceof Error ? txErr.message : String(txErr)}`
            )
          }
        }
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.error(
        `[MasteryAnalytics] updateDailyStatsFromResponses failed: userId=${userId} error=${errMsg}`
      )
    }
  }

  async captureWeakStrongSnapshots(userId: string): Promise<void> {
    try {
      const mastery = await prisma.topicPerformance.findMany({
        where: { userId },
        orderBy: { accuracy: 'asc' },
      })
      const safeMastery = Array.isArray(mastery) ? mastery : []
      const weakTopics = safeMastery
        .filter(t => t.strengthLevel === 'weak' && t.totalAttempts >= 3)
        .slice(0, 10)
      const strongTopics = safeMastery
        .filter(t => ['mastered', 'proficient'].includes(t.strengthLevel) && t.totalAttempts >= 3)
        .slice(0, 10)
      await prisma.userAreaSnapshot.create({
        data: {
          userId,
          type: AreaSnapshotType.WEAK,
          snapshot: {
            topics: weakTopics.map(t => ({
              topicId: t.topicId,
              topicName: t.topicName,
              accuracy: t.accuracy,
              totalAttempts: t.totalAttempts,
            })),
          },
        },
      })
      await prisma.userAreaSnapshot.create({
        data: {
          userId,
          type: AreaSnapshotType.STRONG,
          snapshot: {
            topics: strongTopics.map(t => ({
              topicId: t.topicId,
              topicName: t.topicName,
              accuracy: t.accuracy,
              totalAttempts: t.totalAttempts,
            })),
          },
        },
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.error(
        `[MasteryAnalytics] captureWeakStrongSnapshots failed: userId=${userId} error=${errMsg}`
      )
    }
  }
}

export const masteryAnalyticsService = new MasteryAnalyticsService()

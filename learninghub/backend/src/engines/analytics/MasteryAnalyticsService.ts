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

      if (!responses || responses.length === 0) return

      // Sort responses chronologically to preserve accurate Bayesian knowledge tracing updates
      const sortedResponses = [...responses].sort(
        (a, b) => a.completedAt.getTime() - b.completedAt.getTime()
      )

      // 1. Group responses by topic in memory to eliminate N+1 database roundtrips
      const topicGroups = new Map<
        string,
        Array<{
          topicId: string
          topicName: string
          subjectName?: string
          isCorrect: boolean
          timeSpentSeconds: number
          completedAt: Date
        }>
      >()

      for (const r of sortedResponses) {
        const topicId = r.topicId ?? r.topicName ?? 'unknown'
        const group = topicGroups.get(topicId) ?? []
        group.push({
          topicId,
          topicName: r.topicName ?? 'General',
          subjectName: r.subjectName ?? undefined,
          isCorrect: r.isCorrect,
          timeSpentSeconds: r.timeSpentSeconds,
          completedAt: r.completedAt,
        })
        topicGroups.set(topicId, group)
      }

      const topicIds = Array.from(topicGroups.keys())

      // 2. Batch fetch all existing topic performance records in a SINGLE query
      const existingList = await prisma.topicPerformance.findMany({
        where: {
          userId,
          topicId: { in: topicIds },
        },
      })
      const existingMap = new Map<string, any>(existingList.map((rec: any) => [rec.topicId, rec]))

      // 3. Compute in-memory BKT, running average time, and strength level for each topic
      const operations: any[] = []
      const aiJobsToDispatch: Array<{
        operation: 'KNOWLEDGE_GRAPH' | 'SPACED_REPETITION'
        params: any
      }> = []

      for (const [topicId, topicResponses] of topicGroups.entries()) {
        const existing = existingMap.get(topicId)
        const sample = topicResponses[0]

        const prevTotal = existing?.totalAttempts ?? 0
        const prevCorrect = existing?.correctAnswers ?? 0
        const prevAvgTime = existing?.avgTimeSeconds ?? 0

        let totalAttempts = prevTotal
        let correctAnswers = prevCorrect
        let totalTimeAccumulator = prevAvgTime * prevTotal
        let currentProb = existing ? existing.accuracy / 100 : 0.1
        let latestCompletedAt = existing?.lastAttemptAt ?? new Date(0)
        let subjectName = existing?.subjectName

        for (const r of topicResponses) {
          totalAttempts += 1
          if (r.isCorrect) correctAnswers += 1
          totalTimeAccumulator += r.timeSpentSeconds
          currentProb = bktService.calculateNextProbability(currentProb, r.isCorrect)

          if (r.completedAt > latestCompletedAt) {
            latestCompletedAt = r.completedAt
          }
          if (r.subjectName) {
            subjectName = r.subjectName
          }
        }

        const nextAccuracy = Math.round(currentProb * 100 * 100) / 100
        const avgTimeSeconds =
          totalAttempts > 0 ? Math.round((totalTimeAccumulator / totalAttempts) * 100) / 100 : 0

        let strengthLevel = 'developing'
        if (totalAttempts < 3) strengthLevel = 'developing'
        else if (currentProb >= 0.9) strengthLevel = 'mastered'
        else if (currentProb >= 0.7) strengthLevel = 'proficient'
        else if (currentProb >= 0.45) strengthLevel = 'familiar'
        else if (currentProb >= 0.25) strengthLevel = 'developing'
        else strengthLevel = 'weak'

        if (existing) {
          operations.push(
            prisma.topicPerformance.update({
              where: { id: existing.id },
              data: {
                totalAttempts,
                correctAnswers,
                accuracy: nextAccuracy,
                avgTimeSeconds,
                strengthLevel,
                lastAttemptAt: latestCompletedAt,
                subjectName: subjectName ?? existing.subjectName,
              },
            })
          )
        } else {
          operations.push(
            prisma.topicPerformance.create({
              data: {
                userId,
                topicId,
                topicName: sample.topicName ?? 'General',
                subjectName,
                accuracy: nextAccuracy,
                totalAttempts,
                correctAnswers,
                avgTimeSeconds,
                strengthLevel,
                lastAttemptAt: latestCompletedAt,
              },
            })
          )
        }

        const prevMasteryScore = existing?.accuracy ?? 0
        const masteryDelta = nextAccuracy - prevMasteryScore

        aiJobsToDispatch.push({
          operation: 'KNOWLEDGE_GRAPH',
          params: {
            topicName: sample.topicName ?? 'unknown',
            masteryScore: nextAccuracy,
            masteryDelta,
          },
        })

        const lastResponse = topicResponses[topicResponses.length - 1]
        aiJobsToDispatch.push({
          operation: 'SPACED_REPETITION',
          params: {
            topicId,
            accuracy: lastResponse.isCorrect ? 1 : 0,
          },
        })
      }

      // 4. Execute all updates/creates in ONE atomic batch transaction
      if (operations.length > 0) {
        await prisma.$transaction(operations, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        })
      }

      // 5. Asynchronously dispatch background AI jobs
      for (const job of aiJobsToDispatch) {
        void jobQueueService.addAIJob({
          userId,
          operation: job.operation,
          params: job.params,
        })
      }

      // 6. Invalidate caches once for all modified topics
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

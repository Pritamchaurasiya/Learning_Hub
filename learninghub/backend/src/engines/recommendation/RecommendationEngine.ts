import { prisma } from '../../prismaClient'
import logger from '../../utils/logger'

export interface LearningPlan {
  planId: string | null
  durationDays: number
  targetExamId: string
  recommendationCount: number
}

export class RecommendationEngine {
  public async generateRecommendations(
    userId: string,
    options?: { maxTopics?: number; existingWindowDays?: number }
  ): Promise<number> {
    const maxTopics = options?.maxTopics ?? 3
    const existingWindowDays = options?.existingWindowDays ?? 7

    try {
      const weakTopics = await prisma.topicPerformance.findMany({
        where: {
          userId,
          strengthLevel: { in: ['weak', 'developing'] },
        },
        orderBy: { accuracy: 'asc' },
        take: maxTopics,
      })

      if (weakTopics.length === 0) {
        logger.info(`[RecommendationEngine] User ${userId} has no weak topics`)
        return 0
      }

      const expiryThreshold = new Date(Date.now() - existingWindowDays * 24 * 60 * 60 * 1000)

      const existingActive = await prisma.recommendationResult.findMany({
        where: {
          userId,
          type: 'PRACTICE_SET',
          consumed: false,
          createdAt: { gte: expiryThreshold },
        },
        select: { entityId: true },
      })

      const existingEntityIds = new Set(existingActive.map((r: any) => r.entityId))

      const newTopics = weakTopics.filter((t: any) => !existingEntityIds.has(`gen-ai-${t.topicId}`))

      if (newTopics.length === 0) {
        logger.info(`[RecommendationEngine] User ${userId} already has active recommendations`)
        return 0
      }

      await prisma.recommendationResult.deleteMany({
        where: { userId, consumed: true },
      })

      const request = await prisma.recommendationRequest.create({
        data: {
          userId,
          type: 'IMPROVEMENT_PLAN',
          context: { reason: 'Test completed, targeting weak areas' },
        },
      })

      for (const [index, topic] of newTopics.entries()) {
        const priorityScore = index === 0 ? 1.0 : index === 1 ? 0.8 : 0.6

        await prisma.recommendationResult.create({
          data: {
            requestId: request.id,
            userId,
            type: 'PRACTICE_SET',
            entityType: 'TEST_TEMPLATE',
            entityId: `gen-ai-${topic.topicId}`,
            priorityScore,
            confidence: 0.9,
            expectedImpact: 0.75,
            reason: `Your mastery in ${topic.topicName ?? 'this topic'} is low (${topic.accuracy.toFixed(2)}). Practice will help.`,
            evidence: {
              accuracy: topic.accuracy,
              lastAttemptAt: topic.lastAttemptAt,
              strengthLevel: topic.strengthLevel,
            },
            expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      }

      logger.info(
        `[RecommendationEngine] Generated ${newTopics.length} recommendations for user ${userId}`
      )
      return newTopics.length
    } catch (error) {
      logger.error(
        `[RecommendationEngine] Failed for user ${userId}`,
        error instanceof Error ? error : new Error(String(error))
      )
      return 0
    }
  }

  public async generateLearningPlan(
    userId: string,
    targetExamId: string,
    durationDays: number = 30
  ): Promise<LearningPlan> {
    try {
      const weakTopics = await prisma.topicPerformance.findMany({
        where: {
          userId,
          strengthLevel: { in: ['weak', 'developing'] },
        },
        orderBy: { accuracy: 'asc' },
        take: 10,
      })

      if (weakTopics.length === 0) {
        logger.info(
          `[RecommendationEngine] No weak topics for user ${userId}, skipping learning plan`
        )
        return { planId: null, durationDays, targetExamId, recommendationCount: 0 }
      }

      const startDate = new Date()
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

      const plan = await prisma.learningPlan.create({
        data: {
          userId,
          name: `${durationDays}-Day Plan for ${targetExamId}`,
          description: `Targeted improvement plan focusing on ${weakTopics.length} weak areas`,
          startDate,
          endDate,
          targetExamId,
          targetScore: null,
          status: 'ACTIVE',
        },
      })

      const items = weakTopics.map((topic: any, index: any) => ({
        planId: plan.id,
        itemType: 'TOPIC_PRACTICE',
        entityId: topic.topicId,
        title: `Practice: ${topic.topicName ?? 'Unknown Topic'}`,
        description: `Current mastery: ${topic.accuracy.toFixed(0)}%. Target: 80%+`,
        dueDate: new Date(
          Date.now() +
            Math.ceil((index + 1) * (durationDays / weakTopics.length)) * 24 * 60 * 60 * 1000
        ),
        completed: false,
        order: index + 1,
      }))

      await prisma.learningPlanItem.createMany({ data: items })

      logger.info(`[RecommendationEngine] Created learning plan ${plan.id} for user ${userId}`)
      return { planId: plan.id, durationDays, targetExamId, recommendationCount: weakTopics.length }
    } catch (error) {
      logger.error(
        `[RecommendationEngine] Learning plan failed for user ${userId}`,
        error instanceof Error ? error : new Error(String(error))
      )
      return { planId: null, durationDays, targetExamId, recommendationCount: 0 }
    }
  }
}

export const recommendationEngine = new RecommendationEngine()

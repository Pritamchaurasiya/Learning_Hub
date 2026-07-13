import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { sendSuccess } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

export class AIAnalyticsController {
  public getRecommendations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId

    const recommendations = await prisma.recommendationResult.findMany({
      where: { userId, consumed: false },
      orderBy: { priorityScore: 'desc' },
      take: 5,
    })

    sendSuccess(res, recommendations)
  })

  public getSpacedRepetitionSchedule = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.userId

      const upcomingReviews = await prisma.spacedRepetitionSchedule.findMany({
        where: { userId },
        orderBy: { nextReview: 'asc' },
        take: 10,
      })

      const topicIds = upcomingReviews
        .map((r: any) => r.topicId)
        .filter((id: any): id is string => id !== null)

      const topics =
        topicIds.length > 0
          ? await prisma.topic.findMany({
              where: { id: { in: topicIds }, deletedAt: null },
              select: { id: true, name: true, subject: { select: { name: true } } },
            })
          : []

      const topicMap = new Map<string, any>(topics.map((t: any) => [t.id, t]))

      const enrichData = upcomingReviews.map((review: any) => {
        const topic = review.topicId ? topicMap.get(review.topicId) : undefined
        return {
          ...review,
          topicName: topic?.name ?? 'Unknown Topic',
          subjectName: topic?.subject?.name ?? 'General',
        }
      })

      sendSuccess(res, enrichData)
    }
  )
}

export const aiAnalyticsController = new AIAnalyticsController()

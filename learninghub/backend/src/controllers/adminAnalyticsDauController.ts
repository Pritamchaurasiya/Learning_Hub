import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { sendSuccess, sendError } from '../utils/responseHelper'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Get Daily Active Users (DAU) analytics
 */
export const getDauAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      sendError(res, 'Forbidden', 403, 'FORBIDDEN')
      return
    }

    const days = parseInt(req.query.days as string) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Using user's lastActive or login history if available.
    // For now, we will simulate DAU using createdAt and updatedAt for simplicity,
    // or better yet, query a theoretical session table.
    // Since LearningHub uses user.updatedAt or user progress as activity:

    const activeUsers = await prisma.user.groupBy({
      by: ['updatedAt'],
      _count: { id: true },
      where: {
        updatedAt: { gte: startDate },
      },
      orderBy: { updatedAt: 'asc' },
    })

    // Grouping by Date string
    const dauMap = new Map<string, number>()

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dauMap.set(d.toISOString().split('T')[0], 0)
    }

    activeUsers.forEach(u => {
      const dateStr = u.updatedAt.toISOString().split('T')[0]
      if (dauMap.has(dateStr)) {
        dauMap.set(dateStr, (dauMap.get(dateStr) || 0) + u._count.id)
      }
    })

    const dauData = Array.from(dauMap.entries())
      .map(([date, activeUsers]) => ({ date, activeUsers }))
      .sort((a, b) => a.date.localeCompare(b.date))

    sendSuccess(res, { data: dauData })
  } catch (error) {
    logger.error(
      'Admin getDauAnalytics error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR')
  }
}

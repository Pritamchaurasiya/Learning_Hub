import { Request, Response } from 'express'
import { prisma } from '../prismaClient'
import { sendSuccess, sendError } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

/**
 * Get Daily Active Users (DAU) analytics
 */
export const getDauAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (!req.user?.userId) {
    sendError(res, 'Forbidden', 403, 'FORBIDDEN')
    return
  }

  const days = parseInt(req.query.days as string) || 30
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const activeUsers = await prisma.user.groupBy({
    by: ['updatedAt'],
    _count: { id: true },
    where: {
      updatedAt: { gte: startDate },
    },
    orderBy: { updatedAt: 'asc' },
  })

  const dauMap = new Map<string, number>()

  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dauMap.set(d.toISOString().split('T')[0], 0)
  }

  activeUsers.forEach((u: any) => {
    const dateStr = u.updatedAt.toISOString().split('T')[0]
    if (dauMap.has(dateStr)) {
      dauMap.set(dateStr, (dauMap.get(dateStr) ?? 0) + u._count.id)
    }
  })

  const dauData = Array.from(dauMap.entries())
    .map(([date, activeUsers]) => ({ date, activeUsers }))
    .sort((a, b) => a.date.localeCompare(b.date))

  sendSuccess(res, { data: dauData })
})

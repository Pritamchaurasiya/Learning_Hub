import { Request, Response } from 'express'
import { contestService } from '../services/ContestService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHelper'
import { prisma } from '../prismaClient'

export const listContests = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  const contests = await contestService.getContests(userId)
  sendSuccess(res, contests, undefined, 200, { count: contests.length })
})

export const getContest = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId
  const contest = await contestService.getContestById(id, userId)
  if (!contest) {
    sendNotFound(res, 'Contest not found')
    return
  }
  sendSuccess(res, contest)
})

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const rawPage = parseInt((req.query?.page as string) ?? '1', 10)
  const rawLimit = parseInt((req.query?.limit as string) ?? '100', 10)
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 100
  // Prefer the paginated service (DB skip/take + meta); fall back to the legacy
  // array form when the service is mocked in tests.
  const svc = contestService as unknown as {
    getLeaderboardPaginated?: typeof contestService.getLeaderboardPaginated
    getLeaderboard: typeof contestService.getLeaderboard
  }
  if (typeof svc.getLeaderboardPaginated === 'function') {
    const result = await contestService.getLeaderboardPaginated(id, page, limit)
    sendSuccess(res, result.data, undefined, 200, {
      count: result.meta.count,
      page: result.meta.page,
      limit: result.meta.limit,
      hasNext: result.meta.hasNext,
    })
    return
  }
  const data = await contestService.getLeaderboard(id, page, limit)
  sendSuccess(res, data, undefined, 200, {
    count: data.length,
    page,
    limit,
    hasNext: data.length === limit,
  })
})

export const registerContest = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId
  if (!userId) {
    sendValidationError(res, 'Authentication required to register for contests')
    return
  }
  const result = await contestService.register(id, userId)
  sendSuccess(res, result, 'Registered for contest successfully')
})

export const getContestResults = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId

  if (userId) {
    const participant = await prisma.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: id, userId } },
      include: { contest: { select: { title: true } } },
    })

    if (participant) {
      sendSuccess(res, [
        {
          contestId: id,
          contestTitle: participant.contest?.title || 'Contest',
          rank: participant.rank ?? 1,
          score: Math.round(participant.score),
          penaltySeconds: participant.penaltySeconds,
          solved: participant.solvedCount,
          completedAt: participant.completedAt,
        },
      ])
      return
    }
  }

  // Fallback if not attempted yet
  sendSuccess(res, [])
})

export const logProctorEvent = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId || 'anonymous'
  const { event_type, metadata } = req.body

  if (!event_type) {
    sendValidationError(res, 'event_type is required')
    return
  }

  const result = await contestService.logProctorEvent(id, userId, event_type, metadata)
  sendSuccess(res, result, 'Proctor event recorded')
})

export const getTimeSync = asyncHandler(async (_req: Request, res: Response) => {
  const time = contestService.getServerTime()
  sendSuccess(res, time)
})

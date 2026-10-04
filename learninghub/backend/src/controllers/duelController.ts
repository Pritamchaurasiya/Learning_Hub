import { Request, Response } from 'express'
import { DuelEngine } from '../services/DuelService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHelper'

export const getDuelProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const username = (req.user as any)?.username || (req.user as any)?.email?.split('@')[0] || 'Duelist'

  const profile = DuelEngine.getOrCreateProfile(userId, username)
  sendSuccess(res, profile, 'Duel profile retrieved successfully')
})

export const enqueueDuel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const username = (req.user as any)?.username || (req.user as any)?.email?.split('@')[0] || 'Duelist'
  const { category = 'ANY', forceGhost = false } = req.body

  if (forceGhost) {
    const ghostMatch = DuelEngine.spawnGhostMatch(userId, username)
    sendSuccess(res, { match: ghostMatch, queued: false, isGhost: true }, 'AI Ghost match initialized')
    return
  }

  const result = DuelEngine.enqueueUser(userId, username, category)

  if (result.match) {
    sendSuccess(res, { match: result.match, queued: false }, 'Match found!')
  } else {
    sendSuccess(res, { match: null, queued: true, queuePosition: result.queuePosition }, 'Added to matchmaking queue')
  }
})

export const leaveDuelQueue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const removed = DuelEngine.leaveQueue(userId)
  sendSuccess(res, { removed }, 'Left matchmaking queue')
})

export const getActiveDuel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const match = DuelEngine.getActiveMatchForUser(userId)

  if (!match) {
    sendSuccess(res, { match: null, inMatch: false }, 'No active duel match found')
    return
  }

  sendSuccess(res, { match, inMatch: true }, 'Active duel match retrieved')
})

export const getDuelMatchById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const matchId = req.params.id as string
  const match = DuelEngine.getMatch(matchId)

  if (!match) {
    sendNotFound(res, 'Duel match not found')
    return
  }

  sendSuccess(res, { match }, 'Match retrieved')
})

export const updateDuelProgress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const matchId = req.params.id as string
  const { testsPassed, keystrokes } = req.body

  if (typeof testsPassed !== 'number') {
    sendValidationError(res, 'testsPassed must be a number')
    return
  }

  const updatedMatch = DuelEngine.updateProgress(matchId, userId, testsPassed, keystrokes)
  if (!updatedMatch) {
    sendNotFound(res, 'Match not found or already finished')
    return
  }

  sendSuccess(res, { match: updatedMatch }, 'Match progress updated')
})

export const submitDuelSolution = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const matchId = req.params.id as string
  const { code, passedAllTests } = req.body

  if (typeof code !== 'string') {
    sendValidationError(res, 'code string is required')
    return
  }

  const result = DuelEngine.submitMatchSolution(matchId, userId, code, Boolean(passedAllTests))
  if (!result) {
    sendNotFound(res, 'Match not found or already finished')
    return
  }

  sendSuccess(
    res,
    {
      match: result.match,
      isWinner: result.isWinner,
      eloDelta: result.eloDelta,
    },
    result.isWinner ? 'Victory recorded! Elo adjusted.' : 'Solution recorded'
  )
})

export const getDuelLeaderboard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const leaderboard = DuelEngine.getLeaderboard()
  sendSuccess(res, { leaderboard }, 'Arena leaderboard retrieved')
})

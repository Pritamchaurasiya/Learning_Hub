import { Request, Response } from 'express'
import { liveSessionService } from '../services/LiveSessionService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound } from '../utils/responseHelper'

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string
  const sessions = await liveSessionService.getAllSessions(status)
  sendSuccess(res, sessions, undefined, 200, { count: sessions.length })
})

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const session = await liveSessionService.getSessionById(id)
  if (!session) {
    sendNotFound(res, 'Live session not found')
    return
  }
  sendSuccess(res, session)
})

export const joinSession = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId || 'guest'
  const result = await liveSessionService.joinSession(id, userId)
  sendSuccess(res, result, 'Joined live session')
})

export const registerSession = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId || 'guest'
  const result = await liveSessionService.registerSession(id, userId)
  sendSuccess(res, result, 'Successfully registered for live class')
})

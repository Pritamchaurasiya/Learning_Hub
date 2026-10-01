import { Request, Response } from 'express'
import { mentorService } from '../services/MentorService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendError } from '../utils/responseHelper'

export const listMentors = asyncHandler(async (req: Request, res: Response) => {
  const expertise = req.query.expertise as string
  const mentors = await mentorService.getMentors(expertise)
  sendSuccess(res, mentors, undefined, 200, { count: mentors.length })
})

export const getMentor = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const mentor = await mentorService.getMentorById(id)
  if (!mentor) {
    sendNotFound(res, 'Mentor not found')
    return
  }
  sendSuccess(res, mentor)
})

export const getMySessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const sessions = await mentorService.getUserSessions(userId)
  sendSuccess(res, sessions, undefined, 200, { count: sessions.length })
})

export const bookSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId
  const { mentor_id, scheduled_at, duration_minutes, topic, notes } = req.body
  if (!mentor_id || !scheduled_at || !topic) {
    sendError(res, 'mentor_id, scheduled_at, and topic are required', 400)
    return
  }
  const session = await mentorService.bookSession(userId, {
    mentor_id,
    scheduled_at,
    duration_minutes: duration_minutes || 60,
    topic,
    notes,
  })
  sendSuccess(res, session, 'Mentorship session booked successfully', 201)
})

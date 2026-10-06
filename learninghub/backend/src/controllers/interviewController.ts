import { Request, Response } from 'express'
import {
  interviewSimulatorService,
  InterviewTrack,
  InterviewDifficulty,
  InterviewPersona,
} from '../services/InterviewSimulatorService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHelper'

export const getTemplates = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const templates = interviewSimulatorService.getTemplates()
  sendSuccess(res, { templates }, 'Interview templates retrieved successfully')
})

export const startSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-candidate'
  const { track, difficulty, persona, questionId } = req.body

  const validTracks: InterviewTrack[] = [
    'ALGORITHM_CODING',
    'SYSTEM_DESIGN',
    'FULLSTACK_LIVE',
    'BEHAVIORAL_STAR',
    'QUANT_PROBLEM_SOLVING',
  ]

  const selectedTrack: InterviewTrack = validTracks.includes(track) ? track : 'ALGORITHM_CODING'
  const selectedDifficulty: InterviewDifficulty = difficulty || 'SENIOR'
  const selectedPersona: InterviewPersona | undefined = persona

  const session = interviewSimulatorService.startSession({
    userId,
    track: selectedTrack,
    difficulty: selectedDifficulty,
    persona: selectedPersona,
    questionId,
  })

  sendSuccess(res, { session }, 'Mock interview session initiated', 201)
})

export const getSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId)
  const session = interviewSimulatorService.getSession(sessionId)

  if (!session) {
    sendNotFound(res, `Interview session ${sessionId} not found`)
    return
  }

  sendSuccess(res, { session }, 'Interview session state retrieved')
})

export const interact = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId)
  const { candidateText, candidateCode, whiteboardNotes } = req.body

  if (!candidateText || typeof candidateText !== 'string') {
    sendValidationError(res, 'candidateText is required and must be a string')
    return
  }

  try {
    const result = interviewSimulatorService.interact({
      sessionId,
      candidateText,
      candidateCode,
      whiteboardNotes,
    })

    sendSuccess(res, result, 'Interviewer response synthesized')
  } catch (err: any) {
    sendNotFound(res, err.message)
  }
})

export const requestHint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId)

  try {
    const hintResult = interviewSimulatorService.requestHint(sessionId)
    sendSuccess(res, hintResult, 'Progressive hint unlocked')
  } catch (err: any) {
    sendNotFound(res, err.message)
  }
})

export const evaluateSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId)

  try {
    const evaluation = interviewSimulatorService.evaluateSession(sessionId)
    sendSuccess(res, { evaluation }, 'Interview evaluated successfully')
  } catch (err: any) {
    sendNotFound(res, err.message)
  }
})

export const getUserHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-candidate'
  const history = interviewSimulatorService.getUserHistory(userId)
  sendSuccess(res, { history }, 'Interview history retrieved')
})

import { Request, Response } from 'express'
import { catAdaptiveService, ConfidenceLevel } from '../services/CatAdaptiveService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHelper'

export const startCatSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'student-candidate-cat-01'
  const { subject } = req.body || {}

  const session = catAdaptiveService.startSession(userId, subject)
  sendSuccess(res, { session }, 'Computerized Adaptive Testing session initialized', 201)
})

export const submitCatAnswer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { sessionId, itemId, selectedOptionId, confidence, timeSpentSeconds } = req.body

  if (!sessionId || !itemId || !selectedOptionId) {
    sendValidationError(res, 'Parameters "sessionId", "itemId", and "selectedOptionId" are required')
    return
  }

  const validConfidences: ConfidenceLevel[] = ['LOW', 'MEDIUM', 'HIGH']
  const parsedConfidence: ConfidenceLevel = validConfidences.includes(confidence) ? confidence : 'MEDIUM'

  try {
    const result = catAdaptiveService.submitAnswer({
      sessionId,
      itemId,
      selectedOptionId,
      confidence: parsedConfidence,
      timeSpentSeconds: timeSpentSeconds ? Number(timeSpentSeconds) : 15,
    })

    sendSuccess(res, result, 'Adaptive answer submitted and theta calibrated')
  } catch (error: any) {
    sendNotFound(res, error.message)
  }
})

export const getCatSessionState = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId)
  const session = catAdaptiveService.getSession(sessionId)

  if (!session) {
    sendNotFound(res, `CAT session with ID "${sessionId}" not found`)
    return
  }

  sendSuccess(res, { session }, 'CAT session state retrieved')
})

export const getCatDiagnosticScorecard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessionId = String(req.params.sessionId)

  try {
    const scorecard = catAdaptiveService.generateScorecard(sessionId)
    sendSuccess(res, { scorecard }, 'Psychometric ability diagnostic scorecard generated')
  } catch (error: any) {
    sendNotFound(res, error.message)
  }
})

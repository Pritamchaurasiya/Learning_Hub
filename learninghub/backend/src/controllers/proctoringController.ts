import { Request, Response } from 'express'
import { proctoringEngineService } from '../services/ProctoringEngineService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export const startProctoringSession = async (req: Request, res: Response) => {
  try {
    const { testAttemptId, examTitle } = req.body
    const userId = req.user?.userId || (req as any).user?.id || 'candidate-mock-student-id'

    if (!testAttemptId || !examTitle) {
      return sendError(res, 'testAttemptId and examTitle are required fields', 400)
    }

    const session = proctoringEngineService.startSession({
      userId,
      testAttemptId,
      examTitle,
    })

    return sendSuccess(res, session, undefined, 201)
  } catch (err: any) {
    logger.error('[ProctoringController] startProctoringSession error:', err)
    return sendError(res, err.message || 'Failed to start proctoring session', 500)
  }
}

export const submitFrameTelemetry = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string
    const telemetry = req.body

    if (!telemetry || telemetry.facesDetectedCount === undefined) {
      return sendError(res, 'Invalid frame telemetry payload', 400)
    }

    const result = proctoringEngineService.processFrameTelemetry(sessionId, telemetry)
    return sendSuccess(res, result)
  } catch (err: any) {
    logger.error('[ProctoringController] submitFrameTelemetry error:', err)
    return sendError(res, err.message || 'Failed to process telemetry', 500)
  }
}

export const recordIncident = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string
    const { type, severity, confidence, description } = req.body

    if (!type || !severity || !description) {
      return sendError(res, 'type, severity, and description are required', 400)
    }

    const incident = proctoringEngineService.logIncident(sessionId, {
      type,
      severity,
      confidence: confidence ?? 0.9,
      description,
    })

    return sendSuccess(res, incident, undefined, 201)
  } catch (err: any) {
    logger.error('[ProctoringController] recordIncident error:', err)
    return sendError(res, err.message || 'Failed to record incident', 500)
  }
}

export const getSessionReport = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string
    const report = proctoringEngineService.finalizeSession(sessionId)
    return sendSuccess(res, report)
  } catch (err: any) {
    logger.error('[ProctoringController] getSessionReport error:', err)
    return sendError(res, err.message || 'Failed to finalize session report', 500)
  }
}

export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string
    const session = proctoringEngineService.getSession(sessionId)

    if (!session) {
      return sendError(res, 'Session not found', 404)
    }

    return sendSuccess(res, session)
  } catch (err: any) {
    logger.error('[ProctoringController] getSessionStatus error:', err)
    return sendError(res, err.message || 'Failed to retrieve session status', 500)
  }
}

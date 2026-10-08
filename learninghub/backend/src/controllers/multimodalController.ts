import { Request, Response } from 'express'
import { multiModalStudioService } from '../services/MultiModalStudioService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export const submitVisionTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, gazeX, gazeY, faceCount, headPitchDeg, headYawDeg, headRollDeg, lightingQuality } = req.body

    if (!sessionId) {
      sendError(res, 'Session ID is required for vision telemetry', 400)
      return
    }

    const userId = (req as any).user?.id || 'anonymous_user'
    const result = multiModalStudioService.processVisionTelemetry({
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      gazeX: typeof gazeX === 'number' ? gazeX : 0,
      gazeY: typeof gazeY === 'number' ? gazeY : 0,
      faceCount: typeof faceCount === 'number' ? faceCount : 1,
      headPitchDeg: typeof headPitchDeg === 'number' ? headPitchDeg : 0,
      headYawDeg: typeof headYawDeg === 'number' ? headYawDeg : 0,
      headRollDeg: typeof headRollDeg === 'number' ? headRollDeg : 0,
      lightingQuality: lightingQuality || 'OPTIMAL',
    })

    sendSuccess(res, result)
  } catch (err) {
    logger.error(`[MultiModalController] Error in submitVisionTelemetry: ${String(err)}`)
    sendError(res, 'Failed to process vision telemetry', 500)
  }
}

export const parseCanvasStrokes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, strokes, contextDomain, rawEquationHint } = req.body

    if (!sessionId) {
      sendError(res, 'Session ID is required for canvas parsing', 400)
      return
    }

    const result = multiModalStudioService.parseCanvasStrokes({
      sessionId,
      strokes: Array.isArray(strokes) ? strokes : [],
      contextDomain,
      rawEquationHint,
    })

    sendSuccess(res, result)
  } catch (err) {
    logger.error(`[MultiModalController] Error in parseCanvasStrokes: ${String(err)}`)
    sendError(res, 'Failed to parse canvas strokes', 500)
  }
}

export const processVoiceTurn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, transcriptText, audioDurationMs, persona } = req.body

    if (!sessionId || !transcriptText) {
      sendError(res, 'Session ID and transcriptText are required', 400)
      return
    }

    const userId = (req as any).user?.id || 'anonymous_user'
    const result = multiModalStudioService.processVoiceTurn({
      sessionId,
      userId,
      transcriptText,
      audioDurationMs: typeof audioDurationMs === 'number' ? audioDurationMs : 2500,
      persona,
    })

    sendSuccess(res, result)
  } catch (err) {
    logger.error(`[MultiModalController] Error in processVoiceTurn: ${String(err)}`)
    sendError(res, 'Failed to process voice turn', 500)
  }
}

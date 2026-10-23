import { Request, Response } from 'express'
import { neuroAdaptiveEngineService } from '../services/NeuroAdaptiveEngineService'
import { sendSuccess, sendError } from '../utils/responseHelper'
import logger from '../utils/logger'

export class NeuroAdaptiveController {
  /**
   * Evaluates cognitive load, fatigue, and flow-state index
   * POST /api/v1/neuro-adaptive/evaluate
   */
  public evaluateCognitiveState = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        sessionId,
        taskType,
        activeDurationMinutes,
        keystroke,
        ocular,
        currentProblemDifficulty,
      } = req.body

      if (!sessionId || !keystroke) {
        sendError(res, 'Missing required fields: sessionId and keystroke telemetry are required', 400)
        return
      }

      const userId = req.user?.userId || (req as any).user?.id || 'anonymous_user'
      const evaluation = neuroAdaptiveEngineService.evaluateCognitiveState({
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
        taskType: taskType || 'DSA_CODING',
        activeDurationMinutes: Number(activeDurationMinutes) || 15,
        keystroke: {
          flightTimeMeanMs: Number(keystroke.flightTimeMeanMs) || 180,
          flightTimeVarianceMs2: Number(keystroke.flightTimeVarianceMs2) || 4500,
          backspaceCountPerMinute: Number(keystroke.backspaceCountPerMinute) || 8,
          pauseCountAboveTwoSec: Number(keystroke.pauseCountAboveTwoSec) || 3,
        },
        ocular: ocular
          ? {
              blinkRatePerMinute: Number(ocular.blinkRatePerMinute) || 18,
              averageFixationDurationMs: Number(ocular.averageFixationDurationMs) || 350,
              saccadeVelocityScore: Number(ocular.saccadeVelocityScore) || 0.85,
            }
          : undefined,
        currentProblemDifficulty: currentProblemDifficulty || 'MEDIUM',
      })

      sendSuccess(res, evaluation, 'Cognitive state evaluated successfully')
    } catch (error) {
      logger.error('[NeuroAdaptiveController] Evaluation failed:', error as Error)
      sendError(res, 'Failed to evaluate cognitive state', 500)
    }
  }

  /**
   * Health check for neuro-adaptive engine
   * GET /api/v1/neuro-adaptive/status
   */
  public getStatus = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      {
        status: 'OPERATIONAL',
        algorithm: "Sweller's Cognitive Load Theory + Keystroke Latency Dynamics",
        version: '1.0.0',
      },
      'Neuro-Adaptive Engine is operational'
    )
  }
}

export const neuroAdaptiveController = new NeuroAdaptiveController()

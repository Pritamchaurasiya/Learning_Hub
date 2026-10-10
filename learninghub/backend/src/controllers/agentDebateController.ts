import { Request, Response } from 'express'
import { agentDebateArenaService } from '../services/AgentDebateArenaService'
import { sendSuccess, sendBadRequest } from '../utils/responseHelper'
import logger from '../utils/logger'

/**
 * Controller for AI Council Adversarial Debate Arena (Milestone 22)
 */
export class AgentDebateController {
  /**
   * GET /api/v1/debate/personas
   */
  public getPersonas = async (req: Request, res: Response): Promise<void> => {
    try {
      const personas = agentDebateArenaService.getPersonas()
      sendSuccess(res, personas)
    } catch (error) {
      logger.error('Failed to retrieve debate personas:', error as Error)
      sendBadRequest(res, 'Could not retrieve debate council personas')
    }
  }

  /**
   * GET /api/v1/debate/presets
   */
  public getPresets = async (req: Request, res: Response): Promise<void> => {
    try {
      const presets = agentDebateArenaService.getPresetTopics()
      sendSuccess(res, presets)
    } catch (error) {
      logger.error('Failed to retrieve debate presets:', error as Error)
      sendBadRequest(res, 'Could not retrieve debate preset topics')
    }
  }

  /**
   * POST /api/v1/debate/conduct
   */
  public conductDebate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { topic, proposal, targetRounds } = req.body

      if (!topic || typeof topic !== 'string' || !topic.trim()) {
        sendBadRequest(res, 'Architecture debate topic is required')
        return
      }

      if (!proposal || typeof proposal !== 'string' || !proposal.trim()) {
        sendBadRequest(res, 'Architecture proposal text is required')
        return
      }

      const rounds = targetRounds ? Number(targetRounds) : 3

      const result = agentDebateArenaService.conductDebate({
        topic: topic.trim(),
        proposal: proposal.trim(),
        targetRounds: rounds,
      })

      sendSuccess(res, result)
    } catch (error) {
      logger.error('Failed to conduct debate session:', error as Error)
      sendBadRequest(res, 'An error occurred during council debate simulation')
    }
  }
}

export const agentDebateController = new AgentDebateController()

import { Request, Response } from 'express'
import { ABTestingService } from '../services/ABTestingService'
import { sendSuccess, sendError, sendValidationError } from '../utils/responseHelper'
import logger from '../utils/logger'

const abTestingService = new ABTestingService()

export const getMyExperiments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendError(res, 'Unauthorized', 401)
      return
    }

    const experiments = abTestingService.getUserExperiments(userId)
    sendSuccess(res, experiments)
  } catch (error: any) {
    logger.error('[ABTestingController] getMyExperiments error', error)
    sendError(res, error.message, 500)
  }
}

export const trackConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendError(res, 'Unauthorized', 401)
      return
    }

    const { experimentId, eventName, value } = req.body
    if (!experimentId || !eventName) {
      sendValidationError(res, 'Missing experimentId or eventName')
      return
    }

    await abTestingService.trackConversion(userId, experimentId, eventName, value)
    sendSuccess(res, { success: true })
  } catch (error: any) {
    logger.error('[ABTestingController] trackConversion error', error)
    sendError(res, error.message, 500)
  }
}

export const getExperimentResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    if (!id) {
      sendValidationError(res, 'Missing experiment ID')
      return
    }

    const results = await abTestingService.getExperimentResults(id as string)
    sendSuccess(res, results)
  } catch (error: any) {
    logger.error('[ABTestingController] getExperimentResults error', error)
    sendError(res, error.message, 500)
  }
}

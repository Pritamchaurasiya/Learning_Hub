import { Request, Response } from 'express'
import { ABTestingService } from '../services/ABTestingService'
import { sendSuccess, sendError, sendValidationError } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

const abTestingService = new ABTestingService()

export const getMyExperiments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId
  if (!userId) {
    sendError(res, 'Unauthorized', 401)
    return
  }

  const experiments = abTestingService.getUserExperiments(userId)
  sendSuccess(res, experiments)
})

export const trackConversion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
})

export const getExperimentResults = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    if (!id) {
      sendValidationError(res, 'Missing experiment ID')
      return
    }

    const results = await abTestingService.getExperimentResults(id as string)
    sendSuccess(res, results)
  }
)

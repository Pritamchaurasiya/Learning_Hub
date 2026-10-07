import { Request, Response } from 'express'
import { edgeAIEngineService } from '../services/EdgeAIEngineService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError } from '../utils/responseHelper'

export const getModelManifests = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const models = edgeAIEngineService.getModelManifests()
  sendSuccess(res, { models }, 'Edge model manifests retrieved successfully')
})

export const postCloudFallback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { prompt, role } = req.body

  if (!prompt || typeof prompt !== 'string') {
    sendValidationError(res, 'Prompt string is required')
    return
  }

  const result = edgeAIEngineService.generateCloudFallback(prompt, role)
  sendSuccess(res, result, 'Cloud proxy fallback response generated')
})

export const registerBenchmark = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { adapterName, tier, tokensPerSec, ttftMs, modelTested, grade } = req.body

  if (!adapterName || typeof tokensPerSec !== 'number') {
    sendValidationError(res, 'adapterName and numeric tokensPerSec are required')
    return
  }

  const result = edgeAIEngineService.registerClientBenchmark({
    adapterName: String(adapterName),
    tier: String(tier || 'TIER_2_WEBGPU_LITE'),
    tokensPerSec,
    ttftMs: Number(ttftMs || 45),
    modelTested: String(modelTested || 'SmolLM2-135M'),
    grade: String(grade || 'GOOD'),
    timestamp: new Date().toISOString(),
  })

  sendSuccess(res, result, 'Client hardware benchmark registered')
})

export const getBenchmarkAnalytics = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const analytics = edgeAIEngineService.getBenchmarkAnalytics()
  sendSuccess(res, { analytics }, 'Fleet benchmark analytics retrieved')
})

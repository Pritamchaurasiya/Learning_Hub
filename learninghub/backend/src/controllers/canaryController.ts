import { Request, Response } from 'express'
import {
  CanaryDeploymentService,
  TargetRegion,
} from '../services/CanaryDeploymentService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHelper'

const getParamId = (req: Request): string => {
  const raw = req.params.id
  return Array.isArray(raw) ? String(raw[0]) : String(raw || '')
}

export const listDeployments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const deployments = CanaryDeploymentService.getAllDeployments()
  sendSuccess(res, { deployments }, 'Canary deployments retrieved successfully')
})

export const getDeploymentById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id: string = getParamId(req)
  const deployment = CanaryDeploymentService.getDeploymentById(id)

  if (!deployment) {
    sendNotFound(res, `Canary deployment with ID "${id}" not found`)
    return
  }

  sendSuccess(res, { deployment }, 'Canary deployment details retrieved')
})

export const startCanaryRollout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const {
    serviceName,
    version,
    previousVersion,
    region,
    gitCommitMessage,
    author,
    sloInvariants,
  } = req.body

  if (!serviceName || !version) {
    sendValidationError(res, 'Both "serviceName" and "version" are required to initiate a rollout')
    return
  }

  const deployment = CanaryDeploymentService.startRollout({
    serviceName: String(serviceName),
    version: String(version),
    previousVersion: previousVersion ? String(previousVersion) : undefined,
    region: region as TargetRegion,
    gitCommitMessage: gitCommitMessage ? String(gitCommitMessage) : undefined,
    author: author ? String(author) : undefined,
    sloInvariants,
  })

  sendSuccess(res, { deployment }, 'Canary progressive rollout successfully initialized', 201)
})

export const advanceStage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id: string = getParamId(req)

  try {
    const deployment = CanaryDeploymentService.advanceStage(id)
    sendSuccess(res, { deployment }, `Deployment successfully advanced to stage ${deployment.stage}`)
  } catch (error: any) {
    sendNotFound(res, error.message)
  }
})

export const triggerManualRollback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id: string = getParamId(req)
  const { reason } = req.body || {}

  try {
    const deployment = CanaryDeploymentService.triggerRollback(id, reason)
    sendSuccess(res, { deployment }, 'Manual emergency rollback executed successfully')
  } catch (error: any) {
    sendNotFound(res, error.message)
  }
})

export const simulateTrafficLoad = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id: string = getParamId(req)
  const { rpsIncrease, injectErrorRatePercent, injectLatencySpikeMs } = req.body || {}

  try {
    const deployment = CanaryDeploymentService.simulateTrafficLoad(id, {
      rpsIncrease: rpsIncrease ? Number(rpsIncrease) : undefined,
      injectErrorRatePercent: injectErrorRatePercent ? Number(injectErrorRatePercent) : undefined,
      injectLatencySpikeMs: injectLatencySpikeMs ? Number(injectLatencySpikeMs) : undefined,
    })

    sendSuccess(res, { deployment }, 'Synthetic traffic load simulation completed')
  } catch (error: any) {
    sendNotFound(res, error.message)
  }
})

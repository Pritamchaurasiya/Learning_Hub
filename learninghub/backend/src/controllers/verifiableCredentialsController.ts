import { Request, Response } from 'express'
import {
  verifiableCredentialService,
  AchievementType,
} from '../services/VerifiableCredentialService'
import { asyncHandler } from '../utils/errorHandler'
import {
  sendSuccess,
  sendUnauthorized,
  sendValidationError,
  sendNotFound,
} from '../utils/responseHelper'

export const issueCredential = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    return sendUnauthorized(res, 'Authentication required to issue verifiable credentials')
  }

  const {
    achievementType,
    courseOrExamId,
    title,
    category,
    percentileRank,
    score,
    totalQuestions,
    walletAddress,
    expirationDays,
  } = req.body || {}

  if (!courseOrExamId || typeof courseOrExamId !== 'string') {
    return sendValidationError(res, 'A valid courseOrExamId string is required')
  }

  if (!title || typeof title !== 'string') {
    return sendValidationError(res, 'A valid title string is required')
  }

  const allowedTypes: AchievementType[] = [
    'COURSE_COMPLETION',
    'CAT_PERCENTILE',
    'ASSESSMENT_MASTERY',
    'COMPETITIVE_EXAM_RANK',
  ]
  const validAchievementType: AchievementType = allowedTypes.includes(achievementType)
    ? achievementType
    : 'COURSE_COMPLETION'

  const vc = await verifiableCredentialService.issueCredential({
    userId,
    achievementType: validAchievementType,
    courseOrExamId: courseOrExamId.trim(),
    title: title.trim(),
    category: typeof category === 'string' ? category.trim() : undefined,
    percentileRank: typeof percentileRank === 'number' ? percentileRank : undefined,
    score: typeof score === 'number' ? score : undefined,
    totalQuestions: typeof totalQuestions === 'number' ? totalQuestions : undefined,
    walletAddress: typeof walletAddress === 'string' ? walletAddress.trim() : undefined,
    expirationDays: typeof expirationDays === 'number' ? expirationDays : undefined,
  })

  sendSuccess(res, vc, 'W3C Verifiable Credential issued successfully', 201)
})

export const verifyCredential = asyncHandler(async (req: Request, res: Response) => {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const { credential, credentialId } = req.body || {}

  const target = credential || credentialId || paramId
  if (!target) {
    return sendValidationError(
      res,
      'A credentialId, W3C JSON-LD credential object, or route parameter is required'
    )
  }

  const result = await verifiableCredentialService.verifyCredential(target)
  sendSuccess(res, result, result.valid ? 'Credential verified' : 'Verification completed with warnings')
})

export const getMyCredentials = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    return sendUnauthorized(res, 'Authentication required')
  }

  const credentials = await verifiableCredentialService.getUserCredentials(userId)
  sendSuccess(res, { credentials }, undefined, 200, { count: credentials.length })
})

export const getCredentialById = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  if (!id) {
    return sendValidationError(res, 'Credential ID is required')
  }

  const vc = await verifiableCredentialService.getCredentialById(id)
  if (!vc) {
    return sendNotFound(res, 'Verifiable credential not found')
  }

  sendSuccess(res, vc)
})

export const getRevocationRegistry = asyncHandler(async (_req: Request, res: Response) => {
  const registry = await verifiableCredentialService.getRevocationRegistry()
  sendSuccess(res, { registry }, undefined, 200, { count: registry.length })
})

export const revokeCredential = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    return sendUnauthorized(res, 'Authentication required')
  }

  const rawId = req.params.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const { reason } = req.body || {}

  if (!id) {
    return sendValidationError(res, 'Credential ID is required')
  }

  await verifiableCredentialService.revokeCredential(
    id,
    typeof reason === 'string' ? reason.trim() : 'Revoked by authority'
  )

  sendSuccess(res, { id, revoked: true }, 'Credential revoked successfully')
})

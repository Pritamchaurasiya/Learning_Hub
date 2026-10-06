import { Request, Response } from 'express'
import {
  resumeEngineService,
  TargetRole,
  ResumeCandidateProfile,
} from '../services/ResumeEngineService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError } from '../utils/responseHelper'

export const generateResume = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'student-candidate-001'
  const targetRole = (req.query.targetRole as TargetRole) || 'FULL_STACK_LEAD'

  const candidateProfile: Partial<ResumeCandidateProfile> = {}
  if (req.query.fullName) candidateProfile.fullName = String(req.query.fullName)
  if (req.query.email) candidateProfile.email = String(req.query.email)
  if (req.query.headline) candidateProfile.headline = String(req.query.headline)
  if (req.query.location) candidateProfile.location = String(req.query.location)

  const resume = resumeEngineService.generateResume({
    userId,
    targetRole,
    candidateProfile,
  })

  sendSuccess(res, { resume }, 'ATS-tailored verifiable resume synthesized successfully')
})

export const verifyResume = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { digest, signature } = req.body

  if (!digest || typeof digest !== 'string' || !signature || typeof signature !== 'string') {
    sendValidationError(res, 'Both "digest" and "signature" hex strings are required for verification')
    return
  }

  const result = resumeEngineService.verifyResumeDigest(digest, signature)
  sendSuccess(res, result, 'Resume cryptographic verification completed')
})

export const exportATSPlainText = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'student-candidate-001'
  const targetRole = (req.query.targetRole as TargetRole) || 'FULL_STACK_LEAD'

  const resume = resumeEngineService.generateResume({
    userId,
    targetRole,
  })

  const plainText = resumeEngineService.formatATSPlainText(resume)
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="resume_${targetRole.toLowerCase()}_ats.txt"`)
  res.status(200).send(plainText)
})

export const exportJSONResume = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'student-candidate-001'
  const targetRole = (req.query.targetRole as TargetRole) || 'FULL_STACK_LEAD'

  const resume = resumeEngineService.generateResume({
    userId,
    targetRole,
  })

  const jsonResume = resumeEngineService.formatJSONResume(resume)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="resume_${targetRole.toLowerCase()}_schema.json"`)
  res.status(200).json(jsonResume)
})

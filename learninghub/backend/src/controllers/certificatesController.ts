import { Request, Response } from 'express'
import { certificateService } from '../services/CertificateService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendError } from '../utils/responseHelper'

export const getMyCertificates = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }
  const certs = await certificateService.getUserCertificates(userId)
  sendSuccess(res, { certificates: certs }, undefined, 200, { count: certs.length })
})

export const generateCertificate = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    sendError(res, 'Authentication required', 401, 'NO_TOKEN')
    return
  }

  const courseId = req.body?.courseId
  if (!courseId || typeof courseId !== 'string') {
    sendError(res, 'courseId is required', 400, 'INVALID_INPUT')
    return
  }

  try {
    const cert = await certificateService.generateCertificate(userId, courseId)
    sendSuccess(
      res,
      { certificateUrl: cert.download_url, certificate: cert },
      'Certificate generated successfully',
      201
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Certificate generation failed'
    if (
      message.includes('must complete') ||
      message.includes('not found') ||
      message.includes('already been issued')
    ) {
      sendError(res, message, 400, 'CERTIFICATE_RULE_VIOLATION')
      return
    }
    throw err
  }
})

export const verifyCertificate = asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code as string
  if (!code) {
    sendError(res, 'Certificate code is required', 400, 'INVALID_INPUT')
    return
  }
  const verification = await certificateService.verifyCertificate(code)
  sendSuccess(res, verification)
})

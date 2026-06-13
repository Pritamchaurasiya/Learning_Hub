import { Request, Response } from 'express'
import { certificateService } from '../services/CertificateService'
import {
  sendSuccess,
  sendInternalError,
  sendValidationError,
  sendUnauthorized,
} from '../utils/responseHelper'
import logger from '../utils/logger'

/**
 * POST /api/v1/certificates/generate
 */
export const generateCertificate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { courseId } = req.body

    if (!courseId) {
      sendValidationError(res, 'Course ID is required')
      return
    }

    const certificateUrl = await certificateService.generateCertificate(userId, courseId)

    sendSuccess(res, {
      message: 'Certificate generated successfully',
      certificateUrl,
    })
  } catch (error) {
    logger.error(
      '[CertificateController] generateCertificate error',
      error instanceof Error ? error : new Error(String(error))
    )
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate certificate'

    if (errorMessage.includes('not completed') || errorMessage.includes('does not offer')) {
      sendValidationError(res, errorMessage)
    } else {
      sendInternalError(res, 'Internal server error')
    }
  }
}

/**
 * GET /api/v1/certificates
 */
export const getMyCertificates = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const certificates = await certificateService.getUserCertificates(userId)

    sendSuccess(res, { certificates })
  } catch (error) {
    logger.error(
      '[CertificateController] getMyCertificates error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

import { Request, Response } from 'express'
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendForbidden,
  sendInternalError,
} from '../utils/responseHelper'
import { prisma } from '../config'
import logger from '../utils/logger'

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR')
      return
    }

    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const fileUrl = `/uploads/${req.file.filename}`

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: fileUrl },
      select: { id: true, email: true, username: true, avatar: true },
    })

    sendSuccess(res, {
      message: 'Avatar uploaded successfully',
      url: fileUrl,
      user,
    })
  } catch (error) {
    logger.error(
      'Media uploadAvatar error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const uploadCourseThumbnail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR')
      return
    }

    const userId = req.user?.userId
    const userRole = (req.user as Record<string, unknown>).role as string | undefined
    if (!userId) {
      sendUnauthorized(res)
      return
    }

    const { courseId } = req.body
    if (!courseId || typeof courseId !== 'string') {
      sendError(res, 'courseId is required in form body', 400, 'VALIDATION_ERROR')
      return
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true },
    })

    if (!course) {
      sendError(res, 'Course not found', 404, 'NOT_FOUND')
      return
    }

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN'
    const isOwner = course.instructorId === userId
    if (!isAdmin && !isOwner) {
      sendForbidden(res, 'You do not have permission to update this course thumbnail')
      return
    }

    const fileUrl = `/uploads/${req.file.filename}`

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { thumbnail: fileUrl },
    })

    sendSuccess(res, {
      message: 'Course thumbnail uploaded successfully',
      url: fileUrl,
      course: updated,
    })
  } catch (error) {
    logger.error(
      'Media uploadCourseThumbnail error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

export const uploadGenericMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400, 'VALIDATION_ERROR')
      return
    }

    const fileUrl = `/uploads/${req.file.filename}`

    sendSuccess(res, {
      message: 'File uploaded successfully',
      url: fileUrl,
    })
  } catch (error) {
    logger.error(
      'Media uploadGenericMedia error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res)
  }
}

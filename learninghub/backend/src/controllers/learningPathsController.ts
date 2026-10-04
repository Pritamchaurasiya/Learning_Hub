import { Request, Response } from 'express'
import { learningPathService } from '../services/LearningPathService'
import { sendSuccess, sendBadRequest, sendNotFound } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

export const getLearningPaths = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const paths = await learningPathService.getLearningPaths(userId)
  sendSuccess(res, paths, undefined, 200, { total: paths.length, count: paths.length })
})

export const getLearningPath = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const id = req.params.id as string

  const path = await learningPathService.getLearningPath(id, userId)
  if (!path) {
    sendNotFound(res, `Learning path with id ${id} not found`)
    return
  }
  sendSuccess(res, path)
})

export const enrollInPath = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const id = req.params.id as string

  try {
    const updated = await learningPathService.enroll(userId, id)
    sendSuccess(res, updated, 'Successfully enrolled in learning path')
  } catch (err: any) {
    sendBadRequest(res, err.message || 'Failed to enroll')
  }
})

export const getMyProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const paths = await learningPathService.getMyProgress(userId)
  sendSuccess(res, paths, undefined, 200, { total: paths.length, count: paths.length })
})

import { Request, Response } from 'express'
import { studyGroupService } from '../services/StudyGroupService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendNotFound, sendValidationError } from '../utils/responseHelper'

export const listStudyGroups = asyncHandler(async (req: Request, res: Response) => {
  const category = req.query.category as string | undefined
  const query = req.query.query as string | undefined
  const groups = await studyGroupService.getGroups({ category, query })
  sendSuccess(res, groups, undefined, 200, { count: groups.length })
})

export const getStudyGroup = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const group = await studyGroupService.getGroupById(id)
  if (!group) {
    sendNotFound(res, 'Study group not found')
    return
  }
  sendSuccess(res, group)
})

export const joinStudyGroup = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId
  const updated = await studyGroupService.joinGroup(id, userId)
  sendSuccess(res, updated, 'Joined study group successfully')
})

export const leaveStudyGroup = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.user?.userId
  const updated = await studyGroupService.leaveGroup(id, userId)
  sendSuccess(res, updated, 'Left study group successfully')
})

export const createStudyGroup = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, category, examTarget, maxMembers, isPrivate, topics } = req.body
  if (!name || !description || !category) {
    sendValidationError(res, 'name, description, and category are required')
    return
  }
  const creatorName = (req.user as any)?.username || (req.user as any)?.email?.split('@')[0] || 'Learner'
  const newGroup = await studyGroupService.createGroup(
    {
      name,
      description,
      category,
      examTarget,
      maxMembers: maxMembers || 100,
      isPrivate: Boolean(isPrivate),
      topics: Array.isArray(topics) ? topics : [],
    },
    creatorName
  )
  sendSuccess(res, newGroup, 'Study group created successfully', 201)
})

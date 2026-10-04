import { Request, Response } from 'express'
import { skillEngineService } from '../services/SkillEngineService'
import { sendSuccess, sendBadRequest } from '../utils/responseHelper'
import { asyncHandler } from '../utils/errorHandler'

export const getSkillGraph = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const domain = req.query.domain as string | undefined

  const result = await skillEngineService.getSkillGraph(userId, domain)
  sendSuccess(res, result)
})

export const recordSkillInteraction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const { skill_id, skillId, is_correct, isCorrect } = req.body

  const targetSkillId = skillId || skill_id
  const targetCorrect = isCorrect !== undefined ? isCorrect : is_correct

  if (!targetSkillId) {
    sendBadRequest(res, 'skillId (or skill_id) is required')
    return
  }

  const result = await skillEngineService.recordInteraction(
    userId,
    String(targetSkillId),
    Boolean(targetCorrect)
  )

  sendSuccess(res, result, 'Skill interaction recorded')
})

export const getNextBestAction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest-user'
  const domain = req.query.domain as string | undefined

  const result = await skillEngineService.getNextBestAction(userId, domain)
  sendSuccess(res, result)
})

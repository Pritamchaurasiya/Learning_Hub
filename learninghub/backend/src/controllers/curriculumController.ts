import { Request, Response } from 'express'
import { CurriculumEngine, TargetExam } from '../services/CurriculumSynthesizerService'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendValidationError, sendNotFound } from '../utils/responseHelper'

export const getCurriculumPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const plan = CurriculumEngine.getPlanForUser(userId)

  sendSuccess(res, { plan }, 'Curriculum plan retrieved successfully')
})

export const generateCurriculumPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const { targetExam, targetDate, weeklyStudyHours, diagnosticScorePercent } = req.body

  if (!targetExam || !targetDate || typeof weeklyStudyHours !== 'number') {
    sendValidationError(res, 'targetExam, targetDate, and weeklyStudyHours (number) are required')
    return
  }

  const validExams: TargetExam[] = [
    'JEE_ADVANCED',
    'GATE_CS',
    'SYSTEM_DESIGN_DSA',
    'SAT_DIGITAL',
    'FULL_STACK_DEV',
  ]

  if (!validExams.includes(targetExam)) {
    sendValidationError(res, `Invalid targetExam. Must be one of: ${validExams.join(', ')}`)
    return
  }

  const plan = CurriculumEngine.generatePlan({
    userId,
    targetExam,
    targetDate,
    weeklyStudyHours: Math.max(1, Math.min(60, weeklyStudyHours)),
    diagnosticScorePercent:
      typeof diagnosticScorePercent === 'number' ? diagnosticScorePercent : 50,
  })

  sendSuccess(res, { plan }, 'Curriculum synthesized successfully', 201)
})

export const recalibrateCurriculumPlan = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const { recentAccuracyPercent, weeklyStudyHoursActual } = req.body

  if (typeof recentAccuracyPercent !== 'number') {
    sendValidationError(res, 'recentAccuracyPercent (number 0-100) is required')
    return
  }

  const updatedPlan = CurriculumEngine.recalibratePlan(
    userId,
    recentAccuracyPercent,
    typeof weeklyStudyHoursActual === 'number' ? weeklyStudyHoursActual : undefined
  )

  if (!updatedPlan) {
    sendNotFound(res, 'Curriculum plan not found for user')
    return
  }

  sendSuccess(res, { plan: updatedPlan }, 'Curriculum pacing recalibrated successfully')
})

export const toggleCurriculumConcept = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId || 'guest-user'
  const moduleId = req.params.moduleId as string
  const conceptId = req.params.conceptId as string

  if (!moduleId || !conceptId) {
    sendValidationError(res, 'moduleId and conceptId are required')
    return
  }

  const result = CurriculumEngine.toggleConcept(userId, moduleId, conceptId)
  if (!result) {
    sendNotFound(res, 'Module or concept not found')
    return
  }

  sendSuccess(
    res,
    { plan: result.plan, concept: result.concept },
    'Concept completion status updated'
  )
})

export const getCurriculumTemplates = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const { curriculumService } = await import('../services/CurriculumService')
  const templates = curriculumService.getTemplates()
  sendSuccess(res, { templates })
})

export const synthesizeCurriculum = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { curriculumService } = await import('../services/CurriculumService')
  const userId = req.user?.userId || 'guest-user'
  const { examTarget, targetHorizonWeeks, weeklyHours, diagnosticScore, weakAreas } = req.body

  if (!examTarget || typeof examTarget !== 'string') {
    sendValidationError(res, 'examTarget string is required (e.g. GATE_CS, JEE_ADVANCED, AWS_SOLUTIONS_ARCHITECT)')
    return
  }

  const result = await curriculumService.synthesizeCurriculum(userId, {
    examTarget,
    targetHorizonWeeks: targetHorizonWeeks ? Number(targetHorizonWeeks) : undefined,
    weeklyHours: weeklyHours ? Number(weeklyHours) : undefined,
    diagnosticScore: diagnosticScore ? Number(diagnosticScore) : undefined,
    weakAreas: Array.isArray(weakAreas) ? weakAreas : undefined,
  })

  sendSuccess(res, result, 'Curriculum roadmap successfully synthesized', 201)
})

export const getActiveCurriculum = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { curriculumService } = await import('../services/CurriculumService')
  const userId = req.user?.userId || 'guest-user'
  const result = await curriculumService.getActiveCurriculum(userId)
  sendSuccess(res, result)
})

export const updateModuleProgress = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { curriculumService } = await import('../services/CurriculumService')
  const userId = req.user?.userId || 'guest-user'
  const rawWeek = Array.isArray(req.params.weekNumber) ? req.params.weekNumber[0] : req.params.weekNumber
  const weekNumber = parseInt(rawWeek as string, 10)
  const { completed } = req.body

  if (isNaN(weekNumber) || weekNumber < 1) {
    sendValidationError(res, 'Valid weekNumber is required in params')
    return
  }

  const result = await curriculumService.updateModuleProgress(userId, weekNumber, Boolean(completed))
  sendSuccess(res, result, 'Module progress successfully recorded')
})


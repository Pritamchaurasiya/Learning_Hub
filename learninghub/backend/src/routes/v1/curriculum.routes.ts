import { Router } from 'express'
import {
  getCurriculumPlan,
  generateCurriculumPlan,
  recalibrateCurriculumPlan,
  toggleCurriculumConcept,
  getCurriculumTemplates,
  synthesizeCurriculum,
  getActiveCurriculum,
  updateModuleProgress,
} from '../../controllers/curriculumController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const curriculumLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'curriculum-api',
})

// Protected routes (optionalAuth supports guest demo mode)
router.use(optionalAuth)
router.use(curriculumLimiter)

// Milestone 10 Dynamic Roadmap Endpoints
router.get('/templates', getCurriculumTemplates)
router.get('/active', getActiveCurriculum)
router.post('/synthesize', synthesizeCurriculum)
router.post('/module/:weekNumber/complete', updateModuleProgress)

// Frontend StudyPlannerPage & CurriculumRoadmapView Compatibility
router.get('/plan', getCurriculumPlan)
router.post('/generate', generateCurriculumPlan)
router.post('/recalibrate', recalibrateCurriculumPlan)
router.post('/modules/:moduleId/concepts/:conceptId/toggle', toggleCurriculumConcept)

export default router

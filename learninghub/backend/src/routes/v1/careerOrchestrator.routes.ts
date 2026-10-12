import { Router } from 'express'
import { careerOrchestratorController } from '../../controllers/careerOrchestratorController'
import { asyncHandler } from '../../utils/errorHandler'

const router = Router()

router.get('/jobs', asyncHandler(careerOrchestratorController.getMatchedJobs))
router.post('/dialogue', asyncHandler(careerOrchestratorController.processDialogue))
router.post('/negotiate', asyncHandler(careerOrchestratorController.evaluateNegotiation))

export default router

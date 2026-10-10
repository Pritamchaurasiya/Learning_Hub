import { Router } from 'express'
import { neuroAdaptiveController } from '../../controllers/neuroAdaptiveController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { asyncHandler } from '../../utils/errorHandler'

const router = Router()

// Public / optional auth routes
router.get('/status', asyncHandler(neuroAdaptiveController.getStatus))
router.post('/evaluate', optionalAuth, asyncHandler(neuroAdaptiveController.evaluateCognitiveState))

export default router

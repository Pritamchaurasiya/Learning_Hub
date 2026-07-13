import { Router } from 'express'
import {
  getMyExperiments,
  trackConversion,
  getExperimentResults,
} from '../../controllers/abTestingController'
import { authenticate, authorizeAdmin } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { trackConversionSchema, getExperimentResultsSchema } from '../../validations/schemas'

const router = Router()

// Public / User routes
router.get('/my-experiments', authenticate, getMyExperiments)
router.post('/track', authenticate, validate(trackConversionSchema), trackConversion)

// Admin routes
router.get(
  '/results/:id',
  authenticate,
  authorizeAdmin,
  validate(getExperimentResultsSchema),
  getExperimentResults
)

export default router

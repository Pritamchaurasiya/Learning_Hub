import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { validate } from '../../middleware/validationMiddleware'
import {
  listProblems,
  getProblemDetails,
  submitProblemSolution,
  getProblemSubmissions,
} from '../../controllers/problemsController'
import { submitProblemSchema } from '../../validations/schemas'

const router = Router()

router.get('/', listProblems)
router.get('/:slug', getProblemDetails)
router.get('/:id/submissions', authenticate, getProblemSubmissions)
router.post(
  '/:id/submit',
  authenticate,
  createRateLimiter({
    windowMs: 10 * 1000,
    max: 2,
    keyPrefix: 'sandbox',
    message: 'Too many code execution requests. Please wait a few seconds before trying again.',
  }),
  validate(submitProblemSchema),
  submitProblemSolution
)

export default router

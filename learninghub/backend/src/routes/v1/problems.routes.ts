import { Router } from 'express'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { submitProblemSchema } from '../../validations/schemas'
import {
  listProblems,
  getProblem,
  submitSolution,
  getSubmissions,
} from '../../controllers/problemsController'

const router = Router()

// Code execution is resource-intensive (sandboxed runtime). Limit per-user to prevent DoS.
const codeExecutionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  keyPrefix: 'problem-exec',
  message: 'Too many code submissions. Please wait before submitting again.',
})

router.get('/', optionalAuth, listProblems)
router.get('/:slug', optionalAuth, getProblem)
router.post(
  '/:id/submit',
  authenticate,
  codeExecutionLimiter,
  validate(submitProblemSchema),
  submitSolution
)
router.get('/:id/submissions', authenticate, getSubmissions)

export default router

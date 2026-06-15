import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { cacheMiddleware } from '../../middleware/cacheMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import {
  listTests,
  getTestDetails,
  startTest,
  autosaveTest,
  submitTest,
  getTestAttempts,
  getTestResults,
  getTestAttemptDetails,
} from '../../controllers/testsController'
import {
  practiceAnswer,
  getTestQuestions,
  getTestAnalytics,
  getAttemptHistory,
  getTimeRemaining,
} from '../../controllers/testEngineController'
import { submitTestSchema } from '../../validations/schemas'

const router = Router()

const testMutationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'test-mutation',
})

// IMPORTANT: Static paths MUST come before parameterized /:id routes
router.get('/', cacheMiddleware(300), listTests)
// Static sub-paths first (before /:id which would shadow them)
router.get('/attempts', authenticate, getTestAttempts)
router.get('/attempts/history', authenticate, getAttemptHistory)
router.get('/attempts/:id', authenticate, getTestAttemptDetails)
router.get('/analytics', authenticate, getTestAnalytics)
router.get('/my-results', authenticate, getTestAttempts) // alias used by quizService
// Parameterized routes after static ones
router.get('/:id', cacheMiddleware(300), getTestDetails)
router.get('/:id/questions', authenticate, getTestQuestions)
router.get('/:id/time', authenticate, getTimeRemaining)
router.post('/:id/start', authenticate, testMutationLimiter, startTest)
router.post('/:id/autosave', authenticate, testMutationLimiter, autosaveTest)
router.post(
  '/:id/submit',
  authenticate,
  testMutationLimiter,
  validate(submitTestSchema),
  submitTest
)
router.post('/:id/practice/answer', authenticate, testMutationLimiter, practiceAnswer)
router.get('/:id/result', authenticate, getTestResults)

export default router

import { Router } from 'express'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { redisCacheMiddleware as cacheMiddleware } from '../../middleware/redisCacheMiddleware'
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
  getOfflineBundle,
  submitOfflineSync,
  processAdaptiveStep,
  diagnoseMisconception,
  createTest,
} from '../../controllers/testsController'
import {
  practiceAnswer,
  getTestQuestions,
  getNextAdaptiveTestQuestion,
  getTestAnalytics,
  getAttemptHistory,
  getTimeRemaining,
} from '../../controllers/testEngineController'
import {
  submitTestSchema,
  autosaveTestSchema,
  createTestSchema,
  bookmarkQuestionSchema,
  removeBookmarkSchema,
} from '../../validations/schemas'
import {
  bookmarkQuestion,
  getBookmarkedQuestions,
  removeBookmark,
} from '../../controllers/questionBookmarksController'

const router = Router()

const testMutationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: 'test-mutation',
})

const testReadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'test-read',
})

// IMPORTANT: Static paths MUST come before parameterized /:id routes
router.get('/', optionalAuth, cacheMiddleware(300), testReadLimiter, listTests)
router.post('/', authenticate, testMutationLimiter, validate(createTestSchema), createTest)
router.get('/attempts', authenticate, getTestAttempts)
router.get('/attempts/history', authenticate, getAttemptHistory)
router.get('/attempts/:id', authenticate, getTestAttemptDetails)
router.get('/analytics', authenticate, getTestAnalytics)
router.get('/my-results', authenticate, getTestAttempts) // alias used by quizService
router.post('/diagnose-misconception', optionalAuth, testMutationLimiter, diagnoseMisconception)

// Bookmark routes
router.get('/bookmarks', authenticate, testReadLimiter, getBookmarkedQuestions)
router.post(
  '/bookmarks',
  authenticate,
  testMutationLimiter,
  validate(bookmarkQuestionSchema),
  bookmarkQuestion
)
router.delete(
  '/bookmarks/:questionId',
  authenticate,
  testMutationLimiter,
  validate(removeBookmarkSchema),
  removeBookmark
)

// Parameterized routes after static ones
router.get('/:id', cacheMiddleware(300), getTestDetails)
router.get('/:id/questions', authenticate, getTestQuestions)
router.get('/:id/attempts', authenticate, getTestAttempts)
router.get('/:id/adaptive-next', authenticate, getNextAdaptiveTestQuestion)
router.get('/:id/offline-bundle', authenticate, testReadLimiter, getOfflineBundle)
router.get('/:id/time', authenticate, getTimeRemaining)

router.post('/:id/start', authenticate, testMutationLimiter, startTest)
router.post(
  '/:id/autosave',
  authenticate,
  testMutationLimiter,
  validate(autosaveTestSchema),
  autosaveTest
)
router.post(
  '/:id/submit',
  authenticate,
  testMutationLimiter,
  validate(submitTestSchema),
  submitTest
)
router.post('/:id/practice/answer', authenticate, testMutationLimiter, practiceAnswer)
router.post('/:id/adaptive/step', authenticate, testMutationLimiter, processAdaptiveStep)
router.post('/:id/offline-sync', authenticate, testMutationLimiter, submitOfflineSync)
router.get('/:id/result', authenticate, getTestResults)

export default router

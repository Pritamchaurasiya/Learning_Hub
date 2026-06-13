import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'
import { checkUsageLimit } from '../../middleware/subscriptionMiddleware'
import {
  analyzeLearningPath,
  getTutorResponse,
  getTutorResponseStream,
  generatePracticeTest,
  generateWeakAreaTest,
  getWeakTopics,
  getChatSessions,
  getChatSessionById,
  createChatSession,
  deleteChatSession,
  reviewCodeSubmission,
} from '../../controllers/aiController'
import {
  analyzeLearningPathSchema,
  tutorMessageSchema,
  createChatSessionSchema,
  generatePracticeTestSchema,
  codeReviewSchema,
} from '../../validations/schemas'

const router = Router()

const aiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: 'ai-generation',
  message: 'Too many AI requests. Please wait a moment.',
})

const aiTestRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 2,
  keyPrefix: 'ai-test-generation',
  message: 'Test generation limit reached. Please wait a minute before generating another test.',
})

router.post(
  '/learning-path',
  authenticate,
  aiRateLimit,
  validate(analyzeLearningPathSchema),
  analyzeLearningPath
)
router.post('/tutor', authenticate, aiRateLimit, validate(tutorMessageSchema), getTutorResponse)
router.post(
  '/tutor/stream',
  authenticate,
  aiRateLimit,
  validate(tutorMessageSchema),
  getTutorResponseStream
)

// AI Chat Session Routes
router.get('/tutor/sessions', authenticate, getChatSessions)
router.post(
  '/tutor/sessions',
  authenticate,
  validate(createChatSessionSchema),
  createChatSession
)
router.get('/tutor/sessions/:id', authenticate, getChatSessionById)
router.delete('/tutor/sessions/:id', authenticate, deleteChatSession)

router.post(
  '/generate-test',
  authenticate,
  aiTestRateLimit,
  checkUsageLimit('aiGenerations'),
  validate(generatePracticeTestSchema),
  generatePracticeTest
)
router.post(
  '/generate-weak-area-test',
  authenticate,
  aiTestRateLimit,
  checkUsageLimit('aiGenerations'),
  validate(generatePracticeTestSchema),
  generateWeakAreaTest
)
router.get('/weak-topics', authenticate, getWeakTopics)
router.post(
  '/code-review',
  authenticate,
  aiRateLimit,
  validate(codeReviewSchema),
  reviewCodeSubmission
)

export default router

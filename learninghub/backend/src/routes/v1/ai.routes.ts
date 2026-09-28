import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import { validate } from '../../middleware/validationMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

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
  consultCouncil,
  consultSpecialist,
} from '../../controllers/aiController'
import {
  analyzeLearningPathSchema,
  tutorMessageSchema,
  createChatSessionSchema,
  generatePracticeTestSchema,
  codeReviewSchema,
} from '../../validations/schemas'
import { ebooksController } from '../../controllers/ebooksController'

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
router.post('/tutor/sessions', authenticate, validate(createChatSessionSchema), createChatSession)
router.get('/tutor/sessions/:id', authenticate, getChatSessionById)
router.delete('/tutor/sessions/:id', authenticate, deleteChatSession)

router.post(
  '/generate-test',
  authenticate,
  aiTestRateLimit,
  validate(generatePracticeTestSchema),
  generatePracticeTest
)
router.post(
  '/generate-weak-area-test',
  authenticate,
  aiTestRateLimit,
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

// Multi-Agent Collaborative Council
router.post('/council/consult', authenticate, aiRateLimit, consultCouncil)
router.post('/council/specialist', authenticate, aiRateLimit, consultSpecialist)

// AI Ebook Smart Reading Companion
router.post(
  '/ebook/summarize-chapter',
  authenticate,
  aiRateLimit,
  ebooksController.summarizeChapterAI
)
router.post(
  '/ebook/explain-paragraph',
  authenticate,
  aiRateLimit,
  ebooksController.explainParagraphAI
)

export default router

import { Router } from 'express'
import {
  getTemplates,
  startSession,
  getSession,
  interact,
  requestHint,
  evaluateSession,
  getUserHistory,
} from '../../controllers/interviewController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

// Rate limiters for interview interactions
const interviewRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'interview-rate',
})

router.use(optionalAuth)

router.get('/templates', getTemplates)
router.get('/history', getUserHistory)
router.post('/start', interviewRateLimiter, startSession)
router.get('/:sessionId', getSession)
router.post('/:sessionId/interact', interviewRateLimiter, interact)
router.post('/:sessionId/hint', interviewRateLimiter, requestHint)
router.post('/:sessionId/evaluate', interviewRateLimiter, evaluateSession)

export default router

import { Router } from 'express'
import {
  startProctoringSession,
  submitFrameTelemetry,
  recordIncident,
  getSessionReport,
  getSessionStatus,
} from '../../controllers/proctoringController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const proctorLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120, // generous rate limit for telemetry streaming (e.g. 2 updates/sec)
  keyPrefix: 'proctoring-engine',
})

router.use(proctorLimiter)

// Session Management
router.post('/sessions/start', optionalAuth, startProctoringSession)
router.get('/sessions/:sessionId', optionalAuth, getSessionStatus)
router.post('/sessions/:sessionId/telemetry', optionalAuth, submitFrameTelemetry)
router.post('/sessions/:sessionId/incidents', optionalAuth, recordIncident)
router.post('/sessions/:sessionId/finalize', optionalAuth, getSessionReport)

export default router

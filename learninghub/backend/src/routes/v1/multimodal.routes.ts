import { Router } from 'express'
import {
  submitVisionTelemetry,
  parseCanvasStrokes,
  processVoiceTurn,
} from '../../controllers/multimodalController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const telemetryLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'multimodal-telemetry',
})

router.use(telemetryLimiter)

router.post('/vision/telemetry', optionalAuth, submitVisionTelemetry)
router.post('/canvas/parse-strokes', optionalAuth, parseCanvasStrokes)
router.post('/voice/turn', optionalAuth, processVoiceTurn)

export default router

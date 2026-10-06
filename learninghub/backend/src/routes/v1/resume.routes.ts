import { Router } from 'express'
import {
  generateResume,
  verifyResume,
  exportATSPlainText,
  exportJSONResume,
} from '../../controllers/resumeController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const resumeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyPrefix: 'resume-engine',
})

router.use(resumeLimiter)

// Synthesis & Tailoring
router.get('/generate', optionalAuth, generateResume)

// Cryptographic Verification
router.post('/verify', verifyResume)

// Standard Exports
router.get('/export/ats-text', optionalAuth, exportATSPlainText)
router.get('/export/json', optionalAuth, exportJSONResume)

export default router

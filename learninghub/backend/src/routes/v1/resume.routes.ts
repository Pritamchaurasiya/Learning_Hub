import { Router } from 'express'
import {
  generateResume,
  verifyResume,
  exportATSPlainText,
  exportJSONResume,
  exportLatexResume,
  importLinkedIn,
  anchorResumeToIpfs,
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

// Cryptographic Verification & On-Chain IPFS Anchoring
router.post('/verify', verifyResume)
router.post('/anchor-ipfs', optionalAuth, anchorResumeToIpfs)

// Multi-Format Exports
router.get('/export/ats-text', optionalAuth, exportATSPlainText)
router.get('/export/json', optionalAuth, exportJSONResume)
router.get('/export/latex', optionalAuth, exportLatexResume)

// Professional Profile Ingestion
router.post('/import/linkedin', optionalAuth, importLinkedIn)

export default router

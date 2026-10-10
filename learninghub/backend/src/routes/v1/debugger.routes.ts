import { Router } from 'express'
import { debuggerController } from '../../controllers/debuggerController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const debuggerLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'debugger-engine',
})

router.use(debuggerLimiter)

router.get('/status', debuggerController.getStatus)
router.post('/trace', optionalAuth, debuggerController.recordTrace)
router.post('/diagnose', optionalAuth, debuggerController.diagnoseTrace)

export default router

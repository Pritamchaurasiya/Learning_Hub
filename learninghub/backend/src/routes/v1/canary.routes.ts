import { Router } from 'express'
import {
  listDeployments,
  getDeploymentById,
  startCanaryRollout,
  advanceStage,
  triggerManualRollback,
  simulateTrafficLoad,
} from '../../controllers/canaryController'
import { optionalAuth } from '../../middleware/authMiddleware'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const canaryLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'canary-engine',
})

router.use(canaryLimiter)

// Query deployments
router.get('/', optionalAuth, listDeployments)
router.get('/:id', optionalAuth, getDeploymentById)

// Progressive delivery lifecycle controls
router.post('/', optionalAuth, startCanaryRollout)
router.post('/:id/advance', optionalAuth, advanceStage)
router.post('/:id/rollback', optionalAuth, triggerManualRollback)

// Synthetic traffic load and anomaly simulation
router.post('/:id/simulate-load', optionalAuth, simulateTrafficLoad)

export default router

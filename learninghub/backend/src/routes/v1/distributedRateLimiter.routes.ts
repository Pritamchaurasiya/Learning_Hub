import { Router } from 'express'
import { distributedRateLimiterController } from '../../controllers/DistributedRateLimiterController'
import { asyncHandler } from '../../utils/errorHandler'

const router = Router()

// Request Admission & Throttling
router.post('/evaluate', asyncHandler(distributedRateLimiterController.evaluateRequest))

// High-Concurrency Race Condition vs Redis Lua Script Atomicity
router.post('/race-condition/simulate', asyncHandler(distributedRateLimiterController.simulateRaceCondition))

// Adaptive Concurrency Limiting (Little's Law / Gradient)
router.get('/adaptive/state', asyncHandler(distributedRateLimiterController.getAdaptiveState))
router.post('/adaptive/update', asyncHandler(distributedRateLimiterController.updateAdaptiveConcurrency))

// Rate Limiter Configuration & SHA-256 Audit Seal
router.get('/audit', asyncHandler(distributedRateLimiterController.getAuditSnapshot))
router.post('/reset', asyncHandler(distributedRateLimiterController.reset))

export default router

import { Router } from 'express'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'
import { requireAdmin } from '../../middleware/roleMiddleware'
import {
  deepHealthCheck,
  getMetrics,
  getDatabaseStatus,
  getCacheStatus,
  getProcesses,
} from '../../controllers/monitoringController'

const router = Router()

router.get('/health', optionalAuth, deepHealthCheck)
router.get('/metrics', authenticate, requireAdmin, getMetrics)
router.get('/database', authenticate, requireAdmin, getDatabaseStatus)
router.get('/cache', authenticate, requireAdmin, getCacheStatus)
router.get('/processes', authenticate, requireAdmin, getProcesses)

export default router

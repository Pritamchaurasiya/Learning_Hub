import { Router } from 'express'
import { authenticate, optionalAuth, authorizeAdmin } from '../../middleware/authMiddleware'
import {
  deepHealthCheck,
  getMetrics,
  getDatabaseStatus,
  getCacheStatus,
  getProcesses,
  getPrometheusMetrics,
} from '../../controllers/monitoringController'

const router = Router()

router.get('/health', optionalAuth, deepHealthCheck)
router.get('/metrics', optionalAuth, getMetrics)
router.get('/metrics/prometheus', optionalAuth, getPrometheusMetrics)
router.get('/database', authenticate, authorizeAdmin, getDatabaseStatus)
router.get('/cache', authenticate, authorizeAdmin, getCacheStatus)
router.get('/processes', authenticate, authorizeAdmin, getProcesses)

export default router

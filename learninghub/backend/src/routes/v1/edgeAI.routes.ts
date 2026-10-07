import { Router } from 'express'
import {
  getModelManifests,
  postCloudFallback,
  registerBenchmark,
  getBenchmarkAnalytics,
} from '../../controllers/edgeAIController'

const router = Router()

// Public & student accessible endpoints
router.get('/models', getModelManifests)
router.post('/cloud-fallback', postCloudFallback)
router.post('/benchmark', registerBenchmark)
router.get('/benchmark/analytics', getBenchmarkAnalytics)

export default router

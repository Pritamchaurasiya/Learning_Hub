import { Router } from 'express'
import { distributedTracingController } from '../../controllers/DistributedTracingController'

const router = Router()

// Traces
router.get('/traces', distributedTracingController.getTraces)
router.get('/trace/:traceId', distributedTracingController.getTraceById)
router.post('/simulate', distributedTracingController.simulateRequest)

// Chaos & Latency
router.post('/chaos', distributedTracingController.setChaosRule)
router.post('/chaos/clear', distributedTracingController.clearChaosRules)
router.get('/latency-distribution', distributedTracingController.getLatencyDistributions)

// Reset
router.post('/reset', distributedTracingController.reset)

export default router

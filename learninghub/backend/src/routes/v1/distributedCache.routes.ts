import { Router } from 'express'
import { distributedCacheController } from '../../controllers/DistributedCacheController'
import { asyncHandler } from '../../utils/errorHandler'

const router = Router()

// Topology & Ring Queries
router.get('/topology', asyncHandler(distributedCacheController.getTopology))
router.post('/items', asyncHandler(distributedCacheController.putItem))

// Cluster Dynamic Membership (Consistent Hashing Key Migration)
router.post('/nodes', asyncHandler(distributedCacheController.addNode))
router.delete('/nodes/:nodeId', asyncHandler(distributedCacheController.removeNode))
router.patch('/nodes/:nodeId/status', asyncHandler(distributedCacheController.setNodeStatus))

// Quorum Consensus Read/Write (R + W > N)
router.post('/quorum/read', asyncHandler(distributedCacheController.executeQuorumRead))
router.post('/quorum/write', asyncHandler(distributedCacheController.executeQuorumWrite))
router.post('/quorum/config', asyncHandler(distributedCacheController.updateQuorumConfig))

// Cache Stampede Mitigation Simulation
router.post('/stampede/simulate', asyncHandler(distributedCacheController.simulateStampede))

// Multi-Tier Hierarchy Simulation (L1/L2/DB)
router.post('/multi-tier/access', asyncHandler(distributedCacheController.simulateMultiTierAccess))

// Reset
router.post('/reset', asyncHandler(distributedCacheController.resetToDefault))

export default router

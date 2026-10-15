import { Router } from 'express'
import { crdtSimulationController } from '../../controllers/CrdtSimulationController'

const router = Router()

// Topology & State
router.get('/topology', crdtSimulationController.getTopology)
router.post('/reset', crdtSimulationController.reset)

// RGA Text Operations
router.post('/insert', crdtSimulationController.localInsert)
router.post('/delete', crdtSimulationController.localDelete)

// Sync & Network Partitioning
router.post('/sync-peers', crdtSimulationController.syncPeers)
router.post('/sync-all', crdtSimulationController.syncAll)
router.post('/partition', crdtSimulationController.setPartition)

// State-based CRDTs (LWW-Register & LWW-Element-Set)
router.post('/lww-register', crdtSimulationController.updateLwwRegister)
router.post('/lww-set', crdtSimulationController.mutateLwwSet)

// Formal Verification
router.get('/verify-laws', crdtSimulationController.verifyAlgebraicLaws)

export default router

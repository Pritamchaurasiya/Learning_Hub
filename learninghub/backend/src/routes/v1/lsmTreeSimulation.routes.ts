import { Router } from 'express'
import { LsmTreeSimulationController } from '../../controllers/LsmTreeSimulationController'

const router = Router()

router.get('/snapshot', LsmTreeSimulationController.getSnapshot)
router.post('/put', LsmTreeSimulationController.put)
router.post('/delete', LsmTreeSimulationController.delete)
router.get('/get', LsmTreeSimulationController.get)
router.post('/flush', LsmTreeSimulationController.flush)
router.post('/compact', LsmTreeSimulationController.compact)
router.post('/crash-recover', LsmTreeSimulationController.crashRecover)

export default router

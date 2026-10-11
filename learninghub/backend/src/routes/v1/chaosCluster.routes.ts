import { Router } from 'express'
import { chaosClusterController } from '../../controllers/chaosClusterController'

const router = Router()

/**
 * @route   GET /api/v1/chaos/presets
 * @desc    Get preset cluster topologies
 * @access  Public
 */
router.get('/presets', chaosClusterController.getPresets)

/**
 * @route   POST /api/v1/chaos/experiment
 * @desc    Execute chaos engineering simulation
 * @access  Public
 */
router.post('/experiment', chaosClusterController.runExperiment)

export default router

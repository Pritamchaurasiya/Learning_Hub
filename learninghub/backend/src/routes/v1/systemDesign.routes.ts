import { Router } from 'express'
import { systemDesignController } from '../../controllers/systemDesignController'

const router = Router()

// GET architecture presets
router.get('/presets/:presetId', (req, res) => systemDesignController.getPreset(req, res))

// POST run discrete-event simulation
router.post('/simulate', (req, res) => systemDesignController.simulate(req, res))

export default router

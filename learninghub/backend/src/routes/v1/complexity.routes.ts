import { Router } from 'express'
import { complexityController } from '../../controllers/complexityController'

const router = Router()

// Public benchmark endpoint and preset library
router.post('/benchmark', complexityController.benchmark)
router.get('/presets', complexityController.getPresets)

export default router

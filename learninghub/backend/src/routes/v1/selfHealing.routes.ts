import { Router } from 'express'
import { selfHealingCodeController } from '../../controllers/selfHealingCodeController'

const router = Router()

// GET code preset snippet
router.get('/presets/:presetId', (req, res) => selfHealingCodeController.getPreset(req, res))

// POST analyze code and synthesize self-healing patch
router.post('/analyze', (req, res) => selfHealingCodeController.analyze(req, res))

export default router

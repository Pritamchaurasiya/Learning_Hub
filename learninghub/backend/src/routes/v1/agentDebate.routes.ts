import { Router } from 'express'
import { agentDebateController } from '../../controllers/agentDebateController'

const router = Router()

/**
 * @route   GET /api/v1/debate/personas
 * @desc    Get AI council personas
 * @access  Public
 */
router.get('/personas', agentDebateController.getPersonas)

/**
 * @route   GET /api/v1/debate/presets
 * @desc    Get preset architecture debate topics
 * @access  Public
 */
router.get('/presets', agentDebateController.getPresets)

/**
 * @route   POST /api/v1/debate/conduct
 * @desc    Conduct multi-agent dialectical debate and synthesize RFC
 * @access  Public
 */
router.post('/conduct', agentDebateController.conductDebate)

export default router

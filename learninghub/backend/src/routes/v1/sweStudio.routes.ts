import { Router } from 'express'
import { SweStudioController } from '../../controllers/sweStudioController'
import { asyncHandler } from '../../utils/errorHandler'

const router = Router()

/**
 * @route   GET /api/v1/swe-studio/presets
 * @desc    Retrieve all benchmark issues
 * @access  Public
 */
router.get('/presets', SweStudioController.getPresets)

/**
 * @route   POST /api/v1/swe-studio/resolve
 * @desc    Execute full end-to-end autonomous SWE agent resolution
 * @access  Public
 */
router.post('/resolve', asyncHandler(SweStudioController.resolveIssue))

/**
 * @route   POST /api/v1/swe-studio/sbfl
 * @desc    Compute Spectrum-Based Fault Localization metrics
 * @access  Public
 */
router.post('/sbfl', SweStudioController.calculateSbfl)

export default router

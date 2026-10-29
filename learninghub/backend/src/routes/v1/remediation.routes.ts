/**
 * remediation.routes.ts
 * 
 * Express router for Adaptive Remediation endpoints.
 */

import { Router } from 'express'
import { remediationController } from '../../controllers/remediationController'

const router = Router()

router.post('/diagnose', (req, res) => remediationController.diagnose(req, res))
router.get('/drill/:conceptId', (req, res) => remediationController.getDrill(req, res))
router.post('/submit-drill', (req, res) => remediationController.submitDrill(req, res))

export default router

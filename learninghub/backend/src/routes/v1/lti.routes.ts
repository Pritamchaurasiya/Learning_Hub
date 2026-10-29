import { Router } from 'express'
import { LtiController } from '../../controllers/ltiController'

const router = Router()

// OIDC Third-Party Login Initiation (GET and POST supported)
router.get('/login', LtiController.initiateLogin)
router.post('/login', LtiController.initiateLogin)

// LTI 1.3 Resource Link Launch
router.post('/launch', LtiController.launch)

// Public JWKS for LMS signature verification
router.get('/jwks', LtiController.getJwks)

// Assignment and Grade Services (AGS) Grade Passback
router.post('/grades/passback', LtiController.passbackGrade)

// Multi-Tenant Institution Management
router.get('/institutions', LtiController.getInstitutions)
router.post('/institutions', LtiController.registerInstitution)
router.get('/institutions/:id/analytics', LtiController.getInstitutionAnalytics)

// Testing / Demo Launch Simulator
router.post('/simulate-launch', LtiController.simulateLaunch)

export default router

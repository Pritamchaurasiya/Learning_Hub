import { Router } from 'express'
import {
  issueCredential,
  verifyCredential,
  getMyCredentials,
  getCredentialById,
  getRevocationRegistry,
  revokeCredential,
} from '../../controllers/verifiableCredentialsController'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

// Public verification endpoints
router.post('/verify', optionalAuth, verifyCredential)
router.get('/verify/:id', optionalAuth, verifyCredential)
router.get('/status/revocation-registry', getRevocationRegistry)

// Authenticated issuance & learner dashboard
router.post('/issue', authenticate, issueCredential)
router.get('/my-credentials', authenticate, getMyCredentials)

// Direct lookup by ID
router.get('/:id', optionalAuth, getCredentialById)
router.post('/:id/revoke', authenticate, revokeCredential)

export default router

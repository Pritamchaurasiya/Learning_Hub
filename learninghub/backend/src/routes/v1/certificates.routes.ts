import { Router } from 'express'
import {
  getMyCertificates,
  generateCertificate,
  verifyCertificate,
} from '../../controllers/certificatesController'
import { authenticate } from '../../middleware/authMiddleware'

const router = Router()

router.get('/my-certificates', authenticate, getMyCertificates)
router.post('/generate', authenticate, generateCertificate)
router.get('/verify/:code', verifyCertificate)

export default router

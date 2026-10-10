import { Router } from 'express'
import { zkAttestationController } from '../../controllers/zkAttestationController'

const router = Router()

// Public zero-knowledge verifier & presets
router.get('/presets', zkAttestationController.getCircuitPresets)
router.post('/verify', zkAttestationController.verifyProof)

// Proof generation & commitment endpoints
router.post('/commitment', zkAttestationController.generateCommitment)
router.post('/prove', zkAttestationController.generateProof)

// Soulbound token metadata & mint payload
router.post('/sbt/mint-payload', zkAttestationController.generateSoulboundToken)

export default router

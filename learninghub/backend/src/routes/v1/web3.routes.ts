import { Router } from 'express'
import { authenticate } from '../../middleware/authMiddleware'
import {
  getProfile,
  updateProfile,
  getNFTCertificates,
  mintNFT,
} from '../../controllers/web3Controller'
import { createRateLimiter } from '../../middleware/rateLimiter'

const router = Router()

const web3RateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'web3',
  message: 'Too many Web3 requests. Please wait before trying again.',
})

// All web3 routes require authentication
router.use(authenticate)

router.get('/profile', getProfile)
router.post('/profile', web3RateLimit, updateProfile)

router.get('/nfts', getNFTCertificates)
router.post('/nfts/mint', web3RateLimit, mintNFT)

export default router

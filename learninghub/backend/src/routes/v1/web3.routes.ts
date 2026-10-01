import { Router } from 'express'
import {
  getWeb3Profile,
  updateWallet,
  getNFTCertificates,
  mintNFT,
} from '../../controllers/web3Controller'
import { authenticate, optionalAuth } from '../../middleware/authMiddleware'

const router = Router()

router.get('/profile', optionalAuth, getWeb3Profile)
router.post('/profile', authenticate, updateWallet)
router.get('/nfts', optionalAuth, getNFTCertificates)
router.post('/nfts/mint', authenticate, mintNFT)

export default router

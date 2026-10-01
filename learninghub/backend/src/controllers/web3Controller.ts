import { Request, Response } from 'express'
import { web3Service } from '../services/Web3Service'
import { asyncHandler } from '../utils/errorHandler'
import { sendSuccess, sendUnauthorized, sendValidationError } from '../utils/responseHelper'

export const getWeb3Profile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const profile = await web3Service.getProfile(userId)
  sendSuccess(res, profile)
})

export const updateWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    return sendUnauthorized(res, 'Authentication required to update wallet')
  }

  const address = req.body?.wallet_address
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  if (!address || typeof address !== 'string' || !ethAddressRegex.test(address.trim())) {
    return sendValidationError(
      res,
      'A valid 40-character hexadecimal Ethereum/Polygon address is required',
      'INVALID_WALLET_ADDRESS'
    )
  }

  const profile = await web3Service.updateWallet(userId, address.trim())
  sendSuccess(res, profile, 'Wallet updated successfully')
})

export const getNFTCertificates = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || 'guest'
  const nfts = await web3Service.getNFTCertificates(userId)
  sendSuccess(res, nfts)
})

export const mintNFT = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId
  if (!userId) {
    return sendUnauthorized(res, 'Authentication required to mint NFT certificates')
  }

  const courseId = req.body?.course_id || 'default'
  const nft = await web3Service.mintNFT(userId, courseId)
  sendSuccess(res, nft, 'NFT certificate minted successfully', 201)
})


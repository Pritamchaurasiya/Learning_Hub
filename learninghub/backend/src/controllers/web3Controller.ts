import { Request, Response } from 'express'
import { web3Service } from '../services/Web3Service'
import {
  sendSuccess,
  sendInternalError,
  sendValidationError,
  sendUnauthorized,
} from '../utils/responseHelper'
import logger from '../utils/logger'

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const profile = await web3Service.getProfile(userId)
    sendSuccess(res, profile)
  } catch (error) {
    logger.error(
      '[Web3Controller] getProfile error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { wallet_address } = req.body
    if (!wallet_address) {
      sendValidationError(res, 'wallet_address is required')
      return
    }

    const profile = await web3Service.updateWallet(userId, wallet_address)
    sendSuccess(res, profile)
  } catch (error) {
    logger.error(
      '[Web3Controller] updateProfile error',
      error instanceof Error ? error : new Error(String(error))
    )
    const msg = error instanceof Error ? error.message : 'Failed to update wallet'
    if (msg.includes('Invalid')) {
      sendValidationError(res, msg)
    } else {
      sendInternalError(res, 'Internal server error')
    }
  }
}

export const getNFTCertificates = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const nfts = await web3Service.getNFTCertificates(userId)
    sendSuccess(res, nfts)
  } catch (error) {
    logger.error(
      '[Web3Controller] getNFTCertificates error',
      error instanceof Error ? error : new Error(String(error))
    )
    sendInternalError(res, 'Internal server error')
  }
}

export const mintNFT = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      sendUnauthorized(res, 'Authentication required')
      return
    }

    const { course_id } = req.body
    if (!course_id) {
      sendValidationError(res, 'course_id is required')
      return
    }

    const nft = await web3Service.mintNFT(userId, course_id)
    sendSuccess(res, nft)
  } catch (error) {
    logger.error(
      '[Web3Controller] mintNFT error',
      error instanceof Error ? error : new Error(String(error))
    )
    const msg = error instanceof Error ? error.message : 'Failed to mint NFT'
    if (
      msg.includes('connect') ||
      msg.includes('not completed') ||
      msg.includes('does not offer')
    ) {
      sendValidationError(res, msg)
    } else {
      sendInternalError(res, 'Internal server error')
    }
  }
}

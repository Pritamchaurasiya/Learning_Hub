import crypto from 'crypto'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

export class Web3Service {
  /**
   * Get or create a Web3 profile for a user
   */
  async getProfile(userId: string) {
    let profile = await prisma.web3Profile.findUnique({
      where: { userId },
    })

    if (!profile) {
        // Return a mock structure without persisting if missing, waiting for real connection
        return {
            id: 'unconnected',
            userId,
            walletAddress: null,
            did: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    }

    return profile
  }

  /**
   * Update the user's wallet address
   */
  async updateWallet(userId: string, walletAddress: string) {
    // Validate wallet address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      throw new Error('Invalid Ethereum wallet address format')
    }

    // In a real implementation, DID would be derived properly via a DID provider
    const did = `did:ethr:${walletAddress}`

    const profile = await prisma.web3Profile.upsert({
      where: { userId },
      update: { walletAddress, did },
      create: {
        userId,
        walletAddress,
        did,
      },
    })

    return profile
  }

  /**
   * Get all NFT certificates for a user
   */
  async getNFTCertificates(userId: string) {
    return prisma.nFTCertificate.findMany({
      where: { userId },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Mint a new NFT Certificate for a completed course
   */
  async mintNFT(userId: string, courseId: string) {
    const profile = await prisma.web3Profile.findUnique({
      where: { userId },
    })

    if (!profile?.walletAddress) {
      throw new Error('Please connect your Web3 wallet first')
    }

    // Verify course completion
    const progress = await prisma.userProgress.findUnique({
      where: {
        idx_unique_user_course: {
          userId,
          courseId,
        },
      },
      include: {
        course: { select: { certificate: true } },
      },
    })

    if (progress?.status !== 'COMPLETED') {
      throw new Error('Course is not completed yet')
    }

    if (!progress.course.certificate) {
      throw new Error('This course does not offer a certificate')
    }

    // Check if already minted
    const existing = await prisma.nFTCertificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })

    if (existing) {
      return existing
    }

    // Prevent mock minting. In production, this must call a real blockchain network (e.g. Ethereum/Polygon)
    throw new Error('Real blockchain integration is currently disabled. Contact support to issue certificates.')
  }
}

export const web3Service = new Web3Service()

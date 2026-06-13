import crypto from 'crypto'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

export class Web3Service {
  /**
   * Generates a deterministic mock DID based on the user's ID
   */
  private generateDID(userId: string): string {
    return `did:ethr:${crypto.createHash('sha256').update(userId).digest('hex').substring(0, 40)}`
  }

  /**
   * Generates a mock Transaction Hash
   */
  private generateTxHash(): string {
    return `0x${crypto.randomBytes(32).toString('hex')}`
  }

  /**
   * Get or create a Web3 profile for a user
   */
  async getProfile(userId: string) {
    let profile = await prisma.web3Profile.findUnique({
      where: { userId },
    })

    profile ??= await prisma.web3Profile.create({
      data: {
        userId,
        did: this.generateDID(userId),
      },
    })

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

    const profile = await prisma.web3Profile.upsert({
      where: { userId },
      update: { walletAddress },
      create: {
        userId,
        walletAddress,
        did: this.generateDID(userId),
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

    // Mock Blockchain Minting Process (Merkle Tree & Hashing)
    const tokenId = Math.floor(Math.random() * 1000000).toString()
    const metadataUri = `ipfs://Qm${crypto
      .randomBytes(32)
      .toString('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 44)}`

    // Create a mock merkle tree path for verifiable credentials
    const leaf = crypto.createHash('sha256').update(`${userId}-${courseId}`).digest('hex')
    const merkleProof = [
      crypto.createHash('sha256').update(Math.random().toString()).digest('hex'),
      crypto.createHash('sha256').update(Math.random().toString()).digest('hex'),
    ]
    const merkleRoot = crypto
      .createHash('sha256')
      .update(leaf + merkleProof[0])
      .digest('hex')

    const nft = await prisma.nFTCertificate.create({
      data: {
        userId,
        courseId,
        tokenId,
        merkleRoot,
        merkleProof,
        transactionHash: this.generateTxHash(),
        metadataUri,
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    })

    logger.info(
      `[Web3Service] Minted NFT Certificate for User ${userId}, Course ${courseId}. TX: ${nft.transactionHash}`
    )
    return nft
  }
}

export const web3Service = new Web3Service()

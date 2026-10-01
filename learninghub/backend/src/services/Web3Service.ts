export interface Web3Profile {
  id: string
  wallet_address: string | null
  did: string | null
}

export interface NFTCertificate {
  id: string
  course: {
    id: string
    title: string
  }
  token_id: string
  merkle_root: string
  merkle_proof: string[]
  transaction_hash: string
  metadata_uri: string
  is_revoked: boolean
  created_at: string
}

const mockWeb3Profiles: Map<string, Web3Profile> = new Map()
const mockNFTs: Map<string, NFTCertificate[]> = new Map()

export class Web3Service {
  async getProfile(userId: string): Promise<Web3Profile> {
    if (!mockWeb3Profiles.has(userId)) {
      mockWeb3Profiles.set(userId, {
        id: `web3-${userId}`,
        wallet_address: '0x71C...89A2',
        did: `did:polygon:${userId}`,
      })
    }
    return mockWeb3Profiles.get(userId)!
  }

  async updateWallet(userId: string, address: string): Promise<Web3Profile> {
    const profile = await this.getProfile(userId)
    profile.wallet_address = address
    return profile
  }

  async getNFTCertificates(userId: string): Promise<NFTCertificate[]> {
    if (!mockNFTs.has(userId)) {
      mockNFTs.set(userId, [
        {
          id: 'nft-1',
          course: {
            id: 'crs-dsa-101',
            title: 'Advanced Data Structures & Algorithms Mastery',
          },
          token_id: '1042',
          merkle_root: '0x4f8a9e21b7c0d3e5f6a7b8c9d0e1f2a3',
          merkle_proof: ['0x1111', '0x2222', '0x3333'],
          transaction_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
          metadata_uri: 'ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          is_revoked: false,
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        },
      ])
    }
    return mockNFTs.get(userId)!
  }

  async mintNFT(userId: string, courseId: string): Promise<NFTCertificate> {
    const list = await this.getNFTCertificates(userId)
    const newNft: NFTCertificate = {
      id: `nft-${Date.now()}`,
      course: {
        id: courseId,
        title: 'Mastery Certification on Chain',
      },
      token_id: String(Math.floor(1000 + Math.random() * 9000)),
      merkle_root: `0x${Date.now().toString(16)}`,
      merkle_proof: [`0x${Math.random().toString(16).slice(2, 8)}`],
      transaction_hash: `0x${Buffer.from(userId + Date.now())
        .toString('hex')
        .slice(0, 40)}`,
      metadata_uri: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      is_revoked: false,
      created_at: new Date().toISOString(),
    }
    list.unshift(newNft)
    return newNft
  }
}

export const web3Service = new Web3Service()

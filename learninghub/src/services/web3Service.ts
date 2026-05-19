import { fetchApi } from '../utils/api'

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

export const web3Service = {
  getProfile: (): Promise<Web3Profile> => fetchApi('/web3/profile'),

  updateWallet: (address: string): Promise<Web3Profile> =>
    fetchApi('/web3/profile', {
      method: 'POST',
      body: JSON.stringify({ wallet_address: address }),
    }),

  getNFTCertificates: (): Promise<NFTCertificate[]> => fetchApi('/web3/nfts'),

  mintNFT: (courseId: string): Promise<NFTCertificate> =>
    fetchApi('/web3/nfts/mint', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    }),
}

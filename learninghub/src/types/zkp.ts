export type ZkCircuitType =
  | 'SCORE_THRESHOLD'
  | 'ELO_RANK_THRESHOLD'
  | 'MASTERY_PERCENTILE'
  | 'ANONYMOUS_MEMBERSHIP'

export interface ZkCircuitPreset {
  id: ZkCircuitType
  name: string
  description: string
  constraints: number
  defaultThreshold: number
  metricLabel: string
}

export interface ZkProofPoints {
  piA: [string, string, string]
  piB: [[string, string], [string, string], [string, string]]
  piC: [string, string, string]
  protocol: 'groth16'
  curve: 'bn128'
}

export interface ZkAttestationProofPayload {
  proofId: string
  circuitType: ZkCircuitType
  circuitName: string
  statement: string
  proof: ZkProofPoints
  publicInputs: {
    thresholdValue: number
    commitmentHash: string
    merkleRoot: string
    issuerDid: string
  }
  verificationStatus: 'VALID' | 'INVALID' | 'REVOKED'
  metadata: {
    provingTimeMs: number
    verificationTimeMs: number
    constraintCount: number
    circuitHash: string
  }
  generatedAt: string
}

export interface ZkCommitment {
  commitmentHash: string
  userDid: string
  circuitType: ZkCircuitType
  createdAt: string
  expiryDate: string
}

export interface SoulboundTokenMetadata {
  tokenId: string
  contractAddress: string
  chainId: number
  networkName: string
  standard: 'ERC-5192'
  isLocked: boolean
  ownerAddressOrDid: string
  attestationClaim: string
  zkProofRef: string
  mintTimestamp: string
  tokenUri: string
  openseaUrl: string
  polygonscanUrl: string
}

export interface GenerateProofRequest {
  userDid: string
  circuitType: ZkCircuitType
  actualScoreOrElo: number
  thresholdValue: number
  saltHex?: string
}

export interface VerifyProofResponse {
  isValid: boolean
  verificationTimeMs: number
  verifiedAt: string
  failureReason?: string
}

/**
 * Canonical W3C Verifiable Credentials & Decentralized Identifiers (DID) Types
 * Compliant with W3C Verifiable Credentials Data Model v1.1 & v2.0
 */

export type AchievementType =
  | 'COURSE_COMPLETION'
  | 'CAT_PERCENTILE'
  | 'ASSESSMENT_MASTERY'
  | 'COMPETITIVE_EXAM_RANK'

export interface W3CIssuer {
  id: string // "did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7"
  name: string
  url: string
  verificationMethod: string
  ethereumAddress: string
}

export interface W3CCredentialSubject {
  id: string // "did:polygon:0x..."
  studentName: string
  studentEmailHash: string // SHA-256 for zero-PII public exposure
  achievementType: AchievementType
  achievementTitle: string
  courseOrExamId: string
  category: string
  percentileRank?: number
  score?: number
  grade?: string
  totalQuestions?: number
  completionDate: string
  criteria: {
    narrative: string
    evidenceUrl: string
  }
}

export interface W3CCredentialStatus {
  id: string
  type: string
  revoked: boolean
  revokedAt?: string
  revocationReason?: string
}

export interface W3CCredentialProof {
  type: string
  created: string
  verificationMethod: string
  proofPurpose: string
  proofValue: string
  merkleRoot: string
  merkleProof: string[]
  ipfsCid: string
  anchor: {
    network: 'Polygon PoS' | 'Base L2' | 'Ethereum'
    contractAddress: string
    blockNumber: number
    transactionHash: string
  }
}

export interface W3CVerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: W3CIssuer
  issuanceDate: string
  expirationDate?: string
  credentialSubject: W3CCredentialSubject
  credentialStatus: W3CCredentialStatus
  proof: W3CCredentialProof
}

export interface CredentialAuditReport {
  signatureValid: boolean
  merkleProofValid: boolean
  issuerTrusted: boolean
  revocationClean: boolean
  notExpired: boolean
  ipfsDigestMatches: boolean
  summary: string
}

export interface CredentialVerificationCheck {
  name: string
  passed: boolean
  details: string
}

export interface CredentialVerificationResult {
  valid: boolean
  credentialId: string
  issuer: W3CIssuer
  subject: W3CCredentialSubject
  issuanceDate: string
  auditReport: CredentialAuditReport
  checks: CredentialVerificationCheck[]
}

export interface IssueCredentialPayload {
  achievementType: AchievementType
  courseOrExamId: string
  title: string
  category?: string
  percentileRank?: number
  score?: number
  totalQuestions?: number
  walletAddress?: string
  expirationDays?: number
}

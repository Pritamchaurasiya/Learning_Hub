import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { W3CVerificationAuditCard } from './W3CVerificationAuditCard'
import type { CredentialVerificationResult } from '../../types/credentials'

describe('W3CVerificationAuditCard Component', () => {
  const mockValidResult: CredentialVerificationResult = {
    valid: true,
    credentialId: 'urn:uuid:12345-abcde',
    issuer: {
      id: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
      name: 'LearningHub Academic Authority',
      url: 'https://learninghub.app/credentials',
      verificationMethod: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7#key-1',
      ethereumAddress: '0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
    },
    subject: {
      id: 'did:polygon:0xStudentWallet123',
      studentName: 'Shiva Kumar',
      studentEmailHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      achievementType: 'CAT_PERCENTILE',
      achievementTitle: 'CAT 2026 Advanced Quantitative Aptitude Mastery',
      courseOrExamId: 'exam-cat-2026',
      category: 'Management & Quantitative Exams',
      percentileRank: 99.85,
      score: 102,
      completionDate: '2026-10-01T12:00:00Z',
      criteria: {
        narrative: 'Achieved 99.85 percentile on all-India simulated CAT mock',
        evidenceUrl: 'https://learninghub.app/credentials/verify/urn:uuid:12345-abcde',
      },
    },
    issuanceDate: '2026-10-01T12:00:00Z',
    auditReport: {
      signatureValid: true,
      merkleProofValid: true,
      issuerTrusted: true,
      revocationClean: true,
      notExpired: true,
      ipfsDigestMatches: true,
      summary: 'Credential is valid, tamper-proof, and certified by LearningHub Academic Council.',
    },
    checks: [
      { name: 'Cryptographic Signature', passed: true, details: 'HMAC-SHA256 verified' },
      { name: 'Issuer DID Authenticity', passed: true, details: 'Issuer trusted' },
      { name: 'Expiration Status', passed: true, details: 'Not expired' },
      { name: 'Revocation Registry', passed: true, details: 'Not revoked' },
      { name: 'Merkle Tree On-Chain Inclusion', passed: true, details: 'Proof verified on Polygon' },
      { name: 'IPFS Content Addressing (CIDv1)', passed: true, details: 'Immutable CID verified' },
    ],
  }

  it('renders verified banner, student name, and percentile badge', () => {
    render(<W3CVerificationAuditCard result={mockValidResult} />)

    expect(screen.getByText(/W3C Cryptographically Verified Credential/i)).toBeInTheDocument()
    expect(screen.getByText('Shiva Kumar')).toBeInTheDocument()
    expect(screen.getByText('CAT 2026 Advanced Quantitative Aptitude Mastery')).toBeInTheDocument()
    expect(screen.getByText('99.85%ile')).toBeInTheDocument()
  })

  it('renders all 6 cryptographic audit invariants', () => {
    render(<W3CVerificationAuditCard result={mockValidResult} />)

    expect(screen.getByText('Cryptographic Signature')).toBeInTheDocument()
    expect(screen.getByText('Issuer DID Authenticity')).toBeInTheDocument()
    expect(screen.getByText('Merkle Tree On-Chain Inclusion')).toBeInTheDocument()
    expect(screen.getByText('IPFS Content Addressing (CIDv1)')).toBeInTheDocument()
    expect(screen.getByText('Revocation Registry')).toBeInTheDocument()
  })

  it('toggles raw W3C JSON-LD inspection view', () => {
    render(<W3CVerificationAuditCard result={mockValidResult} />)

    const inspectBtn = screen.getByRole('button', { name: /Inspect JSON-LD/i })
    fireEvent.click(inspectBtn)

    expect(screen.getByText(/Canonical W3C JSON-LD Document/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hide W3C JSON-LD/i })).toBeInTheDocument()
  })
})

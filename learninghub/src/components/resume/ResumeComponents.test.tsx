import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VerifiablePortfolioBadge } from './VerifiablePortfolioBadge'
import { ResumeCustomizerPanel } from './ResumeCustomizerPanel'
import { ResumeExportActions } from './ResumeExportActions'
import { resumeService } from '../../services/resumeService'
import { VerifiableResumePayload } from '../../types/resume'

describe('Resume Subcomponents (Milestone 12 Anti-Gravity Resume)', () => {
  const dummyResume: VerifiableResumePayload = {
    id: 'res-test-01',
    userId: 'user-01',
    targetRole: 'FULL_STACK_LEAD',
    roleTitle: 'Lead Full Stack Software Engineer',
    generatedAt: '2026-10-06T00:00:00Z',
    profile: {
      fullName: 'Alex Morgan',
      headline: 'Lead Full Stack Architect',
      email: 'alex@example.com',
      location: 'San Francisco, CA',
      githubUrl: 'https://github.com/alex',
      linkedinUrl: 'https://linkedin.com/in/alex',
      didIdentifier: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
    },
    summary: 'Expert in full stack architecture and verifiable credentials.',
    skillsMatrix: {
      languages: ['TypeScript', 'Python'],
      frameworks: ['React', 'Node.js'],
      systemsAndCloud: ['PostgreSQL', 'Docker'],
      algorithmicCompetencies: ['BKT', 'SM-2+'],
    },
    verifiedPlatformHighlights: ['Maintained 2240 Elo rating in 1v1 Arena Duels'],
    experiences: [],
    projects: [],
    education: [],
    credentials: [],
    atsScoring: {
      overallScore: 95,
      grade: 'A+',
      criteriaScores: {
        quantifiedMetricsScore: 24,
        actionVerbsScore: 24,
        keywordOptimizationScore: 23,
        formattingComplianceScore: 24,
      },
      actionableFeedback: ['All key ATS criteria met'],
      detectedKeywords: ['react', 'typescript'],
      missingKeywords: [],
    },
    cryptographicProof: {
      canonicalDigestSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      signatureHmac: '1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e',
      didAnchor: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
      verificationUrl: '/verify-certificate?proof=9a8b7c6d',
    },
  }

  it('renders VerifiablePortfolioBadge and triggers live integrity verification', async () => {
    vi.spyOn(resumeService, 'verifyResumeProof').mockResolvedValueOnce({
      isValid: true,
      verifiedAt: '2026-10-06T00:00:00Z',
      statusMessage: 'Cryptographic proof invariant verified',
    })

    render(
      <VerifiablePortfolioBadge
        didAnchor={dummyResume.cryptographicProof.didAnchor}
        canonicalDigest={dummyResume.cryptographicProof.canonicalDigestSha256}
        signatureHmac={dummyResume.cryptographicProof.signatureHmac}
        verificationUrl={dummyResume.cryptographicProof.verificationUrl}
      />
    )

    expect(screen.getByText(/Anti-Gravity Cryptographically Verifiable Resume/i)).toBeInTheDocument()
    expect(screen.getByText(/W3C DID Anchored/i)).toBeInTheDocument()

    // Click Verify Integrity
    const verifyBtn = screen.getByRole('button', { name: /Verify Integrity/i })
    fireEvent.click(verifyBtn)

    await waitFor(() => {
      expect(screen.getByText(/Cryptographic proof invariant verified/i)).toBeInTheDocument()
    })
  })

  it('renders ResumeCustomizerPanel with role options and ATS criteria bars', () => {
    const handleRoleChange = vi.fn()

    render(
      <ResumeCustomizerPanel
        selectedRole="FULL_STACK_LEAD"
        onRoleChange={handleRoleChange}
        atsScoring={dummyResume.atsScoring}
      />
    )

    expect(screen.getByText(/Role-Targeted Tailoring Engine/i)).toBeInTheDocument()
    expect(screen.getByText(/95\/100/i)).toBeInTheDocument()
    expect(screen.getByText(/Grade A\+/i)).toBeInTheDocument()

    const algoBtn = screen.getByRole('button', { name: /Algorithm Specialist/i })
    fireEvent.click(algoBtn)
    expect(handleRoleChange).toHaveBeenCalledWith('ALGORITHM_ENGINEER')
  })

  it('triggers ATS plain text and JSON resume downloads from ResumeExportActions', () => {
    const downloadAtsSpy = vi.spyOn(resumeService, 'downloadATSPlainText').mockImplementation(() => {})
    const downloadJsonSpy = vi.spyOn(resumeService, 'downloadJSONResume').mockImplementation(() => {})

    render(<ResumeExportActions resume={dummyResume} />)

    const atsBtn = screen.getByRole('button', { name: /ATS Plain Text \(\.txt\)/i })
    fireEvent.click(atsBtn)
    expect(downloadAtsSpy).toHaveBeenCalledWith(dummyResume)

    const jsonBtn = screen.getByRole('button', { name: /JSON Resume \(\.json\)/i })
    fireEvent.click(jsonBtn)
    expect(downloadJsonSpy).toHaveBeenCalledWith(dummyResume)
  })
})

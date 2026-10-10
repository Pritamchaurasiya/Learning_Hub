import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ResumePortfolioPage } from './ResumePortfolioPage'
import { resumeService } from '../services/resumeService'
import { VerifiableResumePayload, TargetRole } from '../types/resume'

const createMockResume = (role: TargetRole = 'FULL_STACK_LEAD'): VerifiableResumePayload => ({
  id: `mock-resume-${role.toLowerCase()}`,
  userId: 'candidate-001',
  targetRole: role,
  roleTitle: role === 'SYSTEMS_ARCHITECT' ? 'Staff Systems Architect' : 'Lead Full Stack Software Engineer',
  generatedAt: '2026-10-06T00:00:00Z',
  profile: {
    fullName: 'ALEX MORGAN',
    headline: 'Senior Architect',
    email: 'alex@example.com',
    location: 'San Francisco, CA',
    githubUrl: 'https://github.com/alex',
    linkedinUrl: 'https://linkedin.com/in/alex',
    didIdentifier: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
  },
  summary: 'Architect specialized in distributed systems and algorithms.',
  skillsMatrix: {
    languages: ['TypeScript', 'Python'],
    frameworks: ['React', 'Node.js'],
    systemsAndCloud: ['PostgreSQL', 'Docker'],
    algorithmicCompetencies: ['BKT', 'SM-2+'],
  },
  verifiedPlatformHighlights: ['Maintained 2240 Elo in 1v1 Arena Duels'],
  experiences: [],
  projects: [],
  education: [],
  credentials: [
    {
      id: 'cred-1',
      title: 'Distributed Systems Mastery',
      issuer: 'LearningHub Consortium',
      issuerDid: 'did:polygon:0x123',
      issuanceDate: '2026-10-01',
      merkleRootHash: 'abc123merkle',
      credentialType: 'ASSESSMENT_MASTERY',
      verificationUrl: '/verify-certificate?id=cred-1',
    },
  ],
  atsScoring: {
    overallScore: 95,
    grade: 'A+',
    criteriaScores: {
      quantifiedMetricsScore: 24,
      actionVerbsScore: 24,
      keywordOptimizationScore: 23,
      formattingComplianceScore: 24,
    },
    actionableFeedback: ['All ATS criteria met.'],
    detectedKeywords: ['react', 'typescript'],
    missingKeywords: [],
  },
  cryptographicProof: {
    canonicalDigestSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    signatureHmac: '1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e',
    didAnchor: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
    verificationUrl: '/verify-certificate?proof=9a8b',
  },
})

describe('ResumePortfolioPage (Milestone 12 Anti-Gravity Resume)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(resumeService, 'getTailoredResume').mockImplementation(async params => {
      const role = params?.targetRole || 'FULL_STACK_LEAD'
      return createMockResume(role)
    })
  })

  it('renders resume page header, role titles, and ATS compatibility scorecard', async () => {
    render(
      <BrowserRouter>
        <ResumePortfolioPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Verifiable AI Resume & Career Portfolio/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Milestone 12/i)).toBeInTheDocument()
    expect(screen.getByText(/Applicant Tracking System \(ATS\) Compatibility/i)).toBeInTheDocument()
    expect(screen.getByText(/ALEX MORGAN/i)).toBeInTheDocument()
    expect(screen.getByText(/Anti-Gravity Cryptographically Verifiable Resume/i)).toBeInTheDocument()
  })

  it('allows switching between target roles (Systems Architect, Algorithm Specialist, etc.)', async () => {
    render(
      <BrowserRouter>
        <ResumePortfolioPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/ALEX MORGAN/i)).toBeInTheDocument()
    })

    const systemsArchitectBtn = screen.getByRole('button', { name: /Systems Architect/i })
    fireEvent.click(systemsArchitectBtn)

    await waitFor(() => {
      expect(screen.getByText(/Staff Systems Architect/i)).toBeInTheDocument()
    })
  })

  it('switches between ATS Resume Sheet, Verifiable Credentials, and Raw Export tabs', async () => {
    render(
      <BrowserRouter>
        <ResumePortfolioPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/ATS Resume Sheet/i)).toBeInTheDocument()
    })

    // Click Verifiable Credentials tab
    const credentialsTab = screen.getByRole('button', { name: /Verifiable Credentials Portfolio/i })
    fireEvent.click(credentialsTab)

    expect(screen.getByText(/Decentralized Verifiable Credentials Portfolio/i)).toBeInTheDocument()

    // Click ATS Plain Text tab
    const plainTextTab = screen.getByRole('button', { name: /^ATS Plain Text$/i })
    fireEvent.click(plainTextTab)

    expect(screen.getByText(/Standard ATS Plain Text Stream/i)).toBeInTheDocument()

    // Click JSON Schema tab
    const jsonTab = screen.getByRole('button', { name: /^JSON Resume Schema$/i })
    fireEvent.click(jsonTab)

    expect(screen.getByText(/Schema.org \/ JSON Resume Standard/i)).toBeInTheDocument()

    // Click LaTeX Template tab
    const latexTab = screen.getByRole('button', { name: /LaTeX Template/i })
    fireEvent.click(latexTab)

    expect(screen.getByText(/Compile-Ready LaTeX Document/i)).toBeInTheDocument()
  })
})


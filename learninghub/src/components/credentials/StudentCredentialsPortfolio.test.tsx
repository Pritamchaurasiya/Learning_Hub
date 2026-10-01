import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { StudentCredentialsPortfolio } from './StudentCredentialsPortfolio'
import { verifiableCredentialService } from '../../services/verifiableCredentialService'
import type { W3CVerifiableCredential } from '../../types/credentials'

// Mock services
vi.mock('../../services/verifiableCredentialService', () => ({
  verifiableCredentialService: {
    getMyCredentials: vi.fn(),
    issueCredential: vi.fn(),
    downloadCertificateSvg: vi.fn(),
    downloadJson: vi.fn(),
  },
}))

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
})

describe('StudentCredentialsPortfolio Component', () => {
  let queryClient: QueryClient

  const mockCredentials: W3CVerifiableCredential[] = [
    {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://learninghub.org/contexts/credentials/v1.jsonld',
      ],
      id: 'urn:uuid:credential-course-001',
      type: ['VerifiableCredential', 'CourseCompletionCredential'],
      issuer: {
        id: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
        name: 'LearningHub Academic Council',
        url: 'https://learninghub.org',
        verificationMethod: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7#key-1',
        ethereumAddress: '0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
      },
      issuanceDate: '2026-10-01T12:00:00.000Z',
      credentialSubject: {
        id: 'did:polygon:0xStudentWallet123',
        studentName: 'Candidate Scholar',
        studentEmailHash: 'sha256hash123',
        achievementType: 'COURSE_COMPLETION',
        achievementTitle: 'Full-Stack Data Structures & Algorithms Mastery',
        courseOrExamId: 'course_dsa_mastery',
        category: 'Computer Science & Engineering',
        score: 98,
        completionDate: '2026-10-01T12:00:00.000Z',
        criteria: {
          narrative: 'Completed all 42 modules with 98% grade',
          evidenceUrl: 'https://learninghub.org/verify/1',
        },
      },
      credentialStatus: {
        id: 'urn:uuid:revocation-001',
        type: 'LearningHubRevocationRegistry2026',
        revoked: false,
      },
      proof: {
        type: 'JsonWebSignature2020',
        created: '2026-10-01T12:00:00.000Z',
        verificationMethod: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7#key-1',
        proofPurpose: 'assertionMethod',
        proofValue: 'eyJhbGciOiJIUzI1NiJ9...',
        merkleRoot: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        merkleProof: [],
        ipfsCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        anchor: {
          network: 'Polygon PoS',
          contractAddress: '0xAnchorContractAddress123',
          blockNumber: 4210984,
          transactionHash: '0xTxHash123',
        },
      },
    },
    {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://learninghub.org/contexts/credentials/v1.jsonld',
      ],
      id: 'urn:uuid:credential-percentile-002',
      type: ['VerifiableCredential', 'CompetitiveExamPercentileCredential'],
      issuer: {
        id: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
        name: 'LearningHub Academic Council',
        url: 'https://learninghub.org',
        verificationMethod: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7#key-1',
        ethereumAddress: '0x71C665C1e78451bEE7065CA80f5338749b75F9B7',
      },
      issuanceDate: '2026-10-01T14:00:00.000Z',
      credentialSubject: {
        id: 'did:polygon:0xStudentWallet123',
        studentName: 'Candidate Scholar',
        studentEmailHash: 'sha256hash456',
        achievementType: 'CAT_PERCENTILE',
        achievementTitle: 'CAT National Grand Mock A+ Percentile',
        courseOrExamId: 'CAT-2026-STAGE-1',
        category: 'Management & Quantitative Exams',
        percentileRank: 99.82,
        score: 114,
        completionDate: '2026-10-01T14:00:00.000Z',
        criteria: {
          narrative: 'Scored 99.82 percentile across 85,200 candidates',
          evidenceUrl: 'https://learninghub.org/verify/2',
        },
      },
      credentialStatus: {
        id: 'urn:uuid:revocation-002',
        type: 'LearningHubRevocationRegistry2026',
        revoked: false,
      },
      proof: {
        type: 'JsonWebSignature2020',
        created: '2026-10-01T14:00:00.000Z',
        verificationMethod: 'did:polygon:0x71C665C1e78451bEE7065CA80f5338749b75F9B7#key-1',
        proofPurpose: 'assertionMethod',
        proofValue: 'eyJhbGciOiJIUzI1NiJ9...',
        merkleRoot: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        merkleProof: [],
        ipfsCid: 'bafybeihdwdcefghij4567890abcdefghijklmnopqrstuvwxyz1234567890',
        anchor: {
          network: 'Base L2',
          contractAddress: '0xBaseAnchorContract123',
          blockNumber: 1598402,
          transactionHash: '0xBaseTxHash123',
        },
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentCredentialsPortfolio />
        </MemoryRouter>
      </QueryClientProvider>
    )

  it('renders loading skeletons initially', () => {
    vi.mocked(verifiableCredentialService.getMyCredentials).mockImplementation(
      () => new Promise(() => {})
    )
    renderComponent()
    expect(screen.getByText(/Verifiable Credentials & Identity/i)).toBeInTheDocument()
    expect(screen.getByText(/W3C DID v1.1/i)).toBeInTheDocument()
  })

  it('renders credentials when loaded and handles filtering', async () => {
    vi.mocked(verifiableCredentialService.getMyCredentials).mockResolvedValue({
      status: 'success',
      data: { credentials: mockCredentials },
    })

    renderComponent()

    await waitFor(() => {
      expect(
        screen.getByText('Full-Stack Data Structures & Algorithms Mastery')
      ).toBeInTheDocument()
      expect(screen.getByText('CAT National Grand Mock A+ Percentile')).toBeInTheDocument()
    })

    // Filter to Course Mastery
    const courseTab = screen.getByRole('button', { name: 'Course Mastery' })
    fireEvent.click(courseTab)

    expect(
      screen.getByText('Full-Stack Data Structures & Algorithms Mastery')
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByText('CAT National Grand Mock A+ Percentile')
      ).not.toBeInTheDocument()
    })

    // Filter to Percentiles
    const percentileTab = screen.getByRole('button', { name: 'Competitive Percentiles' })
    fireEvent.click(percentileTab)

    await waitFor(() => {
      expect(
        screen.queryByText('Full-Stack Data Structures & Algorithms Mastery')
      ).not.toBeInTheDocument()
    })
    expect(screen.getByText('CAT National Grand Mock A+ Percentile')).toBeInTheDocument()
  })

  it('invokes download handlers when clicking download buttons', async () => {
    vi.mocked(verifiableCredentialService.getMyCredentials).mockResolvedValue({
      status: 'success',
      data: { credentials: mockCredentials },
    })

    renderComponent()

    await waitFor(() => {
      expect(
        screen.getByText('Full-Stack Data Structures & Algorithms Mastery')
      ).toBeInTheDocument()
    })

    const svgButtons = screen.getAllByTitle('Download Vector Certificate (SVG)')
    expect(svgButtons.length).toBeGreaterThan(0)
    fireEvent.click(svgButtons[0])
    expect(verifiableCredentialService.downloadCertificateSvg).toHaveBeenCalledWith(
      mockCredentials[0]
    )

    const jsonButtons = screen.getAllByTitle('Export W3C JSON-LD Document')
    expect(jsonButtons.length).toBeGreaterThan(0)
    fireEvent.click(jsonButtons[0])
    expect(verifiableCredentialService.downloadJson).toHaveBeenCalledWith(mockCredentials[0])
  })

  it('renders empty state when no credentials and offers demo generation', async () => {
    vi.mocked(verifiableCredentialService.getMyCredentials).mockResolvedValue({
      status: 'success',
      data: { credentials: [] },
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText(/No Verifiable Credentials Yet/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Generate Demo Credential/i)).toBeInTheDocument()
  })
})

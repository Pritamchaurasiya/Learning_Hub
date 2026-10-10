import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import VerifyScorecardPage from './VerifyScorecardPage'
import { testsAService } from '../services/testsAService'
import { scorecardPdfService } from '../services/scorecardPdfService'

// Mock services
vi.mock('../services/testsAService', () => ({
  testsAService: {
    verifyScorecard: vi.fn(),
  },
}))

vi.mock('../services/scorecardPdfService', () => ({
  scorecardPdfService: {
    downloadScorecard: vi.fn().mockResolvedValue(undefined),
    generateVerificationAudit: vi.fn(),
  },
}))

vi.mock('../components/SEO', () => ({
  SEO: () => null,
}))

vi.mock('../components/AnimatedPage', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const createWrapper = (initialEntries = ['/verify-scorecard']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VerifyScorecardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    })
  })

  it('renders portal title, input controls, and verify button', () => {
    render(<VerifyScorecardPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Official Scorecard Verification Registry')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('e.g. LH-118FE82C-4BD5B272-2DB3D418-4BD5B271')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verify Authenticity/i })).toBeInTheDocument()
  })

  it('displays verified academic scorecard details on valid verification code', async () => {
    vi.mocked(testsAService.verifyScorecard).mockResolvedValue({
      status: 'success',
      data: {
        valid: true,
        status: 'AUTHENTIC_VERIFIED',
        verification_code: 'LH-118FE82C-4BD5B272-2DB3D418-4BD5B271',
        candidate_name: 'Ananya Sharma',
        test_title: 'National Mathematics Invitational',
        test_mode: 'mock',
        score: 88,
        percentage: 88,
        passed: true,
        submitted_at: '2026-10-10T12:00:00Z',
        time_taken_seconds: 2400,
        integrity_risk_level: 'EXCELLENT',
        proctoring_verified: true,
      },
    })

    render(<VerifyScorecardPage />, {
      wrapper: createWrapper(['/verify-scorecard?code=LH-118FE82C-4BD5B272-2DB3D418-4BD5B271']),
    })

    await waitFor(() => {
      expect(screen.getByText('Ananya Sharma')).toBeInTheDocument()
    })

    expect(screen.getByText('National Mathematics Invitational')).toBeInTheDocument()
    expect(screen.getByText('88%')).toBeInTheDocument()
    expect(screen.getByText('PASSED')).toBeInTheDocument()
    expect(screen.getByText('Integrity Level: EXCELLENT')).toBeInTheDocument()
    expect(screen.getByText(/Cryptographically Verified/i)).toBeInTheDocument()
  })

  it('displays failure warning card when verification code is tampered or invalid', async () => {
    vi.mocked(testsAService.verifyScorecard).mockRejectedValue(
      new Error('Cryptographic digest mismatch. This scorecard content appears to have been altered.')
    )

    render(<VerifyScorecardPage />, {
      wrapper: createWrapper(['/verify-scorecard?code=LH-INVALID-TAMPERED-CODE']),
    })

    await waitFor(() => {
      expect(screen.getByText('Scorecard Verification Failed')).toBeInTheDocument()
    })

    expect(
      screen.getByText(/Cryptographic digest mismatch/i)
    ).toBeInTheDocument()
  })

  it('triggers PDF download when Official PDF button is clicked', async () => {
    vi.mocked(testsAService.verifyScorecard).mockResolvedValue({
      status: 'success',
      data: {
        valid: true,
        status: 'AUTHENTIC_VERIFIED',
        verification_code: 'LH-118FE82C-4BD5B272-2DB3D418-4BD5B271',
        candidate_name: 'Ananya Sharma',
        test_title: 'National Mathematics Invitational',
        test_mode: 'mock',
        score: 88,
        percentage: 88,
        passed: true,
        submitted_at: '2026-10-10T12:00:00Z',
        time_taken_seconds: 2400,
        integrity_risk_level: 'EXCELLENT',
        proctoring_verified: true,
      },
    })

    render(<VerifyScorecardPage />, {
      wrapper: createWrapper(['/verify-scorecard?code=LH-118FE82C-4BD5B272-2DB3D418-4BD5B271']),
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Official PDF/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Official PDF/i }))

    expect(scorecardPdfService.downloadScorecard).toHaveBeenCalled()
  })
})

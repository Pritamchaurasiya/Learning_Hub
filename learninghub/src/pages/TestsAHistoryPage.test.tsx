import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'
import TestsAHistoryPage from './TestsAHistoryPage'
import { testsAService } from '../services/testsAService'
import { badgeService } from '../services/badgeService'
import { scorecardPdfService } from '../services/scorecardPdfService'

vi.mock('../services/testsAService', () => ({
  testsAService: {
    getMyResults: vi.fn(),
  },
}))

vi.mock('../services/badgeService', () => ({
  badgeService: {
    getUserBadges: vi.fn(),
  },
}))

vi.mock('../services/scorecardPdfService', () => ({
  scorecardPdfService: {
    downloadScorecard: vi.fn().mockResolvedValue(undefined),
    generateVerificationAudit: vi.fn().mockReturnValue({
      verificationHash: 'LH-118FE82C-4BD5B272-2DB3D418-4BD5B271',
      verificationUrl:
        'http://localhost/verify-scorecard?code=LH-118FE82C-4BD5B272-2DB3D418-4BD5B271',
      issuedAt: '2026-08-20T10:23:20Z',
    }),
  },
  ScorecardPdfService: {
    downloadScorecard: vi.fn().mockResolvedValue(undefined),
    generateVerificationAudit: vi.fn().mockReturnValue({
      verificationHash: 'LH-118FE82C-4BD5B272-2DB3D418-4BD5B271',
      verificationUrl:
        'http://localhost/verify-scorecard?code=LH-118FE82C-4BD5B272-2DB3D418-4BD5B271',
      issuedAt: '2026-08-20T10:23:20Z',
    }),
  },
}))

// Mock ResponsiveContainer for Recharts
vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

const mockHistoryData = [
  {
    id: 'attempt-1',
    test: 'test-1',
    test_id: 'test-1',
    test_title: 'Full-Stack Web Development Mock Exam',
    score: 85,
    passed: true,
    status: 'submitted',
    time_taken_seconds: 1400,
    started_at: '2026-08-20T10:00:00Z',
    submitted_at: '2026-08-20T10:23:20Z',
    answers: [{ question_id: 'q1', is_correct: true, topic: 'Web Engineering' }],
  },
  {
    id: 'attempt-2',
    test: 'test-2',
    test_id: 'test-2',
    test_title: 'Algorithms & Data Structures Challenge',
    score: 45,
    passed: false,
    status: 'submitted',
    time_taken_seconds: 1800,
    started_at: '2026-08-21T14:00:00Z',
    submitted_at: '2026-08-21T14:30:00Z',
    answers: [{ question_id: 'q2', is_correct: false, topic: 'Algorithms' }],
  },
]

const mockBadgesData = {
  badges: [
    {
      id: 'badge-1',
      name: 'First Test Cleared',
      description: 'Scored passing grade on your first assessment',
      icon: 'trophy',
      category: 'tests',
      tier: 'bronze',
      isEarned: true,
      earnedAt: '2026-08-20T10:23:20Z',
      progress: 100,
      maxProgress: 100,
    },
  ],
}

describe('TestsAHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(testsAService.getMyResults).mockResolvedValue({
      status: 'success',
      data: mockHistoryData as any,
    })
    vi.mocked(badgeService.getUserBadges).mockResolvedValue({
      status: 'success',
      data: mockBadgesData as any,
    })
  })

  it('renders stats, history records, and earned badges', async () => {
    render(<TestsAHistoryPage />)

    await waitFor(() => {
      expect(screen.getByText('Tests A+ History')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Full-Stack Web Development Mock Exam' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Algorithms & Data Structures Challenge' })).toBeInTheDocument()
      expect(screen.getByText('First Test Cleared')).toBeInTheDocument()
      expect(screen.getAllByText('85%').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('45%').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('button', { name: /Verify Scorecard/i })).toBeInTheDocument()
    })
  })

  it('filters history list by passed / failed buttons', async () => {
    render(<TestsAHistoryPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Full-Stack Web Development Mock Exam' })).toBeInTheDocument()
    })

    const passedFilterBtn = screen.getByRole('button', { name: /^passed$/i })
    fireEvent.click(passedFilterBtn)

    expect(screen.getByRole('heading', { name: 'Full-Stack Web Development Mock Exam' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Algorithms & Data Structures Challenge' })).not.toBeInTheDocument()

    const failedFilterBtn = screen.getByRole('button', { name: /^failed$/i })
    fireEvent.click(failedFilterBtn)

    expect(screen.getByRole('heading', { name: 'Algorithms & Data Structures Challenge' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Full-Stack Web Development Mock Exam' })).not.toBeInTheDocument()
  })

  it('opens and closes topic drill-down modal', async () => {
    render(<TestsAHistoryPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Drill-Down/i }).length).toBeGreaterThanOrEqual(1)
    })

    const drillDownBtns = screen.getAllByRole('button', { name: /Drill-Down/i })
    fireEvent.click(drillDownBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Assessment Drill-Down & Verification')).toBeInTheDocument()
      expect(screen.getByText('Socratic AI Study Recommendation')).toBeInTheDocument()
    })

    const closeBtn = screen.getByRole('button', { name: /^close$/i })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText('Assessment Drill-Down & Verification')).not.toBeInTheDocument()
    })
  })

  it('triggers PDF scorecard generation when clicking PDF Scorecard button', async () => {
    render(<TestsAHistoryPage />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /PDF Scorecard/i }).length).toBeGreaterThanOrEqual(1)
    })

    const downloadBtns = screen.getAllByRole('button', { name: /PDF Scorecard/i })
    fireEvent.click(downloadBtns[0])

    await waitFor(() => {
      expect(scorecardPdfService.downloadScorecard).toHaveBeenCalled()
    })
  })

  it('renders empty state when no test attempts exist', async () => {
    vi.mocked(testsAService.getMyResults).mockResolvedValue({
      status: 'success',
      data: [] as any,
    })

    render(<TestsAHistoryPage />)

    await waitFor(() => {
      expect(screen.getByText(/No test attempts found/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Browse Practice Tests/i })).toBeInTheDocument()
    })
  })
})


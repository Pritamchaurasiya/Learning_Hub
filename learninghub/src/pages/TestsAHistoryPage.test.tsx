import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'
import TestsAHistoryPage from './TestsAHistoryPage'
import { testsAService } from '../services/testsAService'
import { badgeService } from '../services/badgeService'

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
    answers: ['A', 'B', 'C'],
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
    answers: ['A', 'C'],
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
      expect(screen.getByText('Full-Stack Web Development Mock Exam')).toBeInTheDocument()
      expect(screen.getByText('Algorithms & Data Structures Challenge')).toBeInTheDocument()
      expect(screen.getByText('First Test Cleared')).toBeInTheDocument()
      expect(screen.getAllByText('85%').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('45%')).toBeInTheDocument()
    })
  })

  it('filters history list by passed / failed buttons', async () => {
    render(<TestsAHistoryPage />)

    await waitFor(() => {
      expect(screen.getByText('Full-Stack Web Development Mock Exam')).toBeInTheDocument()
    })

    const passedFilterBtn = screen.getByRole('button', { name: /^passed$/i })
    fireEvent.click(passedFilterBtn)

    expect(screen.getByText('Full-Stack Web Development Mock Exam')).toBeInTheDocument()
    expect(screen.queryByText('Algorithms & Data Structures Challenge')).not.toBeInTheDocument()

    const failedFilterBtn = screen.getByRole('button', { name: /^failed$/i })
    fireEvent.click(failedFilterBtn)

    expect(screen.getByText('Algorithms & Data Structures Challenge')).toBeInTheDocument()
    expect(screen.queryByText('Full-Stack Web Development Mock Exam')).not.toBeInTheDocument()
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

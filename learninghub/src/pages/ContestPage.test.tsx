import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import ContestPage from './ContestPage'
import { contestService, type Contest } from '../services/contestService'

vi.mock('../services/contestService', () => ({
  contestService: {
    getContests: vi.fn(),
    getContestResults: vi.fn(),
    participate: vi.fn(),
  },
}))

describe('ContestPage Component', () => {
  const mockContests: Contest[] = [
    {
      contest_id: 'cnt-1',
      title: 'Weekly Algorithmic Clash #42',
      description: 'Solve 4 competitive programming problems in 90 minutes',
      start_time: '2026-03-01T10:00:00Z',
      end_time: '2026-03-01T11:30:00Z',
      duration: 90,
      participants: 1250,
      problem_count: 4,
      status: 'active',
      difficulty: 'medium',
      prize: '$1,000 & Badges',
    },
    {
      contest_id: 'cnt-2',
      title: 'Grand Dynamic Programming Marathon',
      description: 'Master DP problems with optimal time complexity',
      start_time: '2026-03-10T14:00:00Z',
      end_time: '2026-03-10T16:00:00Z',
      duration: 120,
      participants: 600,
      problem_count: 5,
      status: 'upcoming',
      difficulty: 'hard',
      prize: '$2,500',
    },
  ]

  const mockResults = [
    {
      contestId: 'cnt-1',
      rank: 1,
      username: 'AlgoGod',
      score: 400,
      time_taken: 3200,
      problems_solved: 4,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(contestService.getContests).mockResolvedValue({
      data: mockContests,
      status: 'success',
    } as any)
    vi.mocked(contestService.getContestResults).mockResolvedValue({
      data: mockResults,
      status: 'success',
    } as any)
  })

  it('renders contests title, active contest cards, and tabs', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(screen.getByText('Combat Arena')).toBeInTheDocument()
      expect(screen.getByText('Weekly Algorithmic Clash #42')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /^active$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^upcoming$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^My Results$/i })).toBeInTheDocument()
  })

  it('switches tabs to upcoming contests when clicked', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(screen.getByText('Weekly Algorithmic Clash #42')).toBeInTheDocument()
    })

    const upcomingTab = screen.getByRole('button', { name: /^upcoming$/i })
    fireEvent.click(upcomingTab)

    await waitFor(() => {
      expect(screen.getByText('Grand Dynamic Programming Marathon')).toBeInTheDocument()
      expect(screen.queryByText('Weekly Algorithmic Clash #42')).not.toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import ContestPage from './ContestPage'
import {
  contestService,
  type Contest,
  type ContestLeaderboardEntry,
} from '../services/contestService'

vi.mock('../services/contestService', () => ({
  contestService: {
    getContests: vi.fn(),
    getContestResults: vi.fn(),
    getLeaderboard: vi.fn(),
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

  const mockLeaderboard: ContestLeaderboardEntry[] = [
    {
      rank: 1,
      user: 'AlphaCoder',
      score: 1000,
      problems_solved: 4,
      finish_time: '1800',
    },
    {
      rank: 2,
      user: 'BetaByte',
      score: 850,
      problems_solved: 3,
      finish_time: '2400',
    },
    {
      rank: 3,
      user: 'GammaGladiator',
      score: 700,
      problems_solved: 3,
      finish_time: '2900',
    },
    {
      rank: 4,
      user: 'DeltaDev',
      score: 500,
      problems_solved: 2,
      finish_time: '3200',
    },
  ]

  const mockResults = [
    {
      contestId: 'cnt-1',
      rank: 1,
      score: 400,
      time: 3200,
      solved: 4,
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
    vi.mocked(contestService.getLeaderboard).mockResolvedValue({
      data: mockLeaderboard,
      status: 'success',
    } as any)
  })

  it('renders contests title, active contest cards, and tabs', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(screen.getByText('Combat Arena')).toBeInTheDocument()
      expect(screen.getAllByText('Weekly Algorithmic Clash #42').length).toBeGreaterThan(0)
    })

    expect(screen.getByRole('button', { name: /^active$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^upcoming$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^My Results$/i })).toBeInTheDocument()
  })

  it('switches tabs to upcoming contests when clicked', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Weekly Algorithmic Clash #42' })
      ).toBeInTheDocument()
    })

    const upcomingTab = screen.getByRole('button', { name: /^upcoming$/i })
    fireEvent.click(upcomingTab)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Grand Dynamic Programming Marathon' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('heading', { name: 'Weekly Algorithmic Clash #42' })
      ).not.toBeInTheDocument()
    })
  })

  it('renders live combat leaderboard with top gladiators and telemetry', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(screen.getByText(/Combat Telemetry & Leaderboard/i)).toBeInTheDocument()
      expect(screen.getAllByText('AlphaCoder').length).toBeGreaterThan(0)
      expect(screen.getAllByText('BetaByte').length).toBeGreaterThan(0)
      expect(screen.getAllByText('GammaGladiator').length).toBeGreaterThan(0)
      expect(screen.getByText('DeltaDev')).toBeInTheDocument()
    })

    // Check scores
    expect(screen.getAllByText(/1000 pts/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/850 pts/i).length).toBeGreaterThan(0)
  })

  it('filters leaderboard entries by competitor search query', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(screen.getByText('DeltaDev')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search gladiator/i)
    fireEvent.change(searchInput, { target: { value: 'Delta' } })

    await waitFor(() => {
      expect(screen.getByText('DeltaDev')).toBeInTheDocument()
      expect(screen.queryByText('AlphaCoder')).not.toBeInTheDocument()
    })
  })

  it('toggles live stream status between active and paused', async () => {
    render(<ContestPage />)

    await waitFor(() => {
      expect(screen.getByText(/Live Stream Active/i)).toBeInTheDocument()
    })

    const liveToggleBtn = screen.getByRole('button', { name: /Toggle Live Sync/i })
    fireEvent.click(liveToggleBtn)

    await waitFor(() => {
      expect(screen.getByText(/Live Sync Paused/i)).toBeInTheDocument()
    })
  })

  it('triggers manual refetch when Sync Now is clicked', async () => {
    render(<ContestPage />)

    // Wait for initial fetch to finish so Sync Now button is enabled
    await waitFor(() => {
      expect(screen.getByText('Sync Now')).toBeInTheDocument()
      expect(contestService.getLeaderboard).toHaveBeenCalledWith('cnt-1')
    })

    const syncBtn = screen.getByRole('button', { name: /Refresh Leaderboard/i })
    expect(syncBtn).not.toBeDisabled()
    fireEvent.click(syncBtn)

    await waitFor(() => {
      expect(contestService.getLeaderboard).toHaveBeenCalledTimes(2)
    })
  })
})

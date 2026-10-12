import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../../test/test-utils'
import ContestLeaderboard from './ContestLeaderboard'
import { contestService, type Contest, type ContestLeaderboardEntry } from '../../services/contestService'

vi.mock('../../services/contestService', () => ({
  contestService: {
    getLeaderboard: vi.fn(),
  },
}))

describe('ContestLeaderboard Component', () => {
  const mockContest: Contest = {
    contest_id: 'cnt-101',
    title: 'Spring Code Clash 2026',
    description: 'Competitive programming tournament',
    start_time: '2026-05-01T10:00:00Z',
    end_time: '2026-05-01T12:00:00Z',
    duration: 120,
    status: 'active',
    participants: 50,
    problem_count: 4,
  }

  const mockAllContests: Contest[] = [mockContest]

  const mockLeaderboard: ContestLeaderboardEntry[] = [
    { rank: 1, user: 'ApexPredator', score: 1000, problems_solved: 4, finish_time: '1200' },
    { rank: 2, user: 'SilverFox', score: 800, problems_solved: 3, finish_time: '2100' },
    { rank: 3, user: 'BronzeKnight', score: 650, problems_solved: 3, finish_time: '2700' },
    { rank: 4, user: 'ShadowDev', score: 400, problems_solved: 2, finish_time: '3400' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(contestService.getLeaderboard).mockResolvedValue({
      status: 'success',
      data: mockLeaderboard,
    } as any)
  })

  it('renders placeholder when no contest is selected', () => {
    render(
      <ContestLeaderboard
        selectedContest={null}
        allContests={[]}
        onSelectContest={vi.fn()}
      />
    )

    expect(screen.getByText('No Combat Records Found')).toBeInTheDocument()
  })

  it('renders leaderboard table with top competitors and scores', async () => {
    render(
      <ContestLeaderboard
        selectedContest={mockContest}
        allContests={mockAllContests}
        onSelectContest={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText('ApexPredator').length).toBeGreaterThan(0)
      expect(screen.getAllByText('SilverFox').length).toBeGreaterThan(0)
      expect(screen.getAllByText('BronzeKnight').length).toBeGreaterThan(0)
      expect(screen.getByText('ShadowDev')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/1000 pts/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/800 pts/i).length).toBeGreaterThan(0)
  })

  it('filters rows by username search query', async () => {
    render(
      <ContestLeaderboard
        selectedContest={mockContest}
        allContests={mockAllContests}
        onSelectContest={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('ShadowDev')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/Search gladiator/i)
    fireEvent.change(searchInput, { target: { value: 'Shadow' } })

    await waitFor(() => {
      expect(screen.getByText('ShadowDev')).toBeInTheDocument()
      expect(screen.queryByText('ApexPredator')).not.toBeInTheDocument()
    })
  })

  it('triggers onNavigateToCombat when combat button is clicked', async () => {
    const handleNavigate = vi.fn()
    render(
      <ContestLeaderboard
        selectedContest={mockContest}
        allContests={mockAllContests}
        onSelectContest={vi.fn()}
        onNavigateToCombat={handleNavigate}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Enter Combat Arena')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Enter Combat Arena'))
    expect(handleNavigate).toHaveBeenCalledWith('cnt-101')
  })

  it('toggles live sync state when button is pressed', async () => {
    render(
      <ContestLeaderboard
        selectedContest={mockContest}
        allContests={mockAllContests}
        onSelectContest={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Live Stream Active/i)).toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole('button', { name: /Toggle Live Sync/i })
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(screen.getByText(/Live Sync Paused/i)).toBeInTheDocument()
    })
  })
})

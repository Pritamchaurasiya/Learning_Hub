import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import LeaderboardPage from './LeaderboardPage'
import { leaderboardService } from '../services/leaderboardService'

vi.mock('../services/leaderboardService', () => ({
  leaderboardService: {
    getLeaderboard: vi.fn(),
  },
}))

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn().mockReturnValue(vi.fn()),
    emit: vi.fn(),
  }),
}))

describe('LeaderboardPage Component', () => {
  const mockLeaderboardData = [
    {
      user_id: 'usr-1',
      username: 'AdaLovelace',
      full_name: 'Ada Lovelace',
      display_name: 'Ada Lovelace',
      avatar_url: 'https://example.com/ada.jpg',
      xp: 2500,
      level: 12,
      rank: 1,
      streak: 15,
      courses_completed: 8,
      is_current_user: false,
    },
    {
      user_id: 'usr-2',
      username: 'AlanTuring',
      full_name: 'Alan Turing',
      display_name: 'Alan Turing',
      avatar_url: 'https://example.com/alan.jpg',
      xp: 2100,
      level: 10,
      rank: 2,
      streak: 10,
      courses_completed: 6,
      is_current_user: true,
    },
    {
      user_id: 'usr-3',
      username: 'GraceHopper',
      full_name: 'Grace Hopper',
      display_name: 'Grace Hopper',
      avatar_url: 'https://example.com/grace.jpg',
      xp: 1800,
      level: 9,
      rank: 3,
      streak: 8,
      courses_completed: 5,
      is_current_user: false,
    },
    {
      user_id: 'usr-4',
      username: 'ClaudeShannon',
      full_name: 'Claude Shannon',
      display_name: 'Claude Shannon',
      avatar_url: 'https://example.com/claude.jpg',
      xp: 1500,
      level: 8,
      rank: 4,
      streak: 5,
      courses_completed: 4,
      is_current_user: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(leaderboardService.getLeaderboard).mockResolvedValue({
      data: mockLeaderboardData as any,
      status: 'success',
    } as any)
  })

  it('renders leaderboard title, podium items, and filters', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Global Ranks')).toBeInTheDocument()
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
      expect(screen.getByText('Alan Turing')).toBeInTheDocument()
      expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
    })

    expect(screen.getByText('All Time')).toBeInTheDocument()
    expect(screen.getByText('Weekly')).toBeInTheDocument()
  })

  it('switches time range filter when clicked', async () => {
    render(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Global Ranks')).toBeInTheDocument()
    })

    const weeklyButton = screen.getByText('Weekly')
    fireEvent.click(weeklyButton)

    await waitFor(() => {
      expect(leaderboardService.getLeaderboard).toHaveBeenCalledWith('weekly', 50)
    })
  })
})

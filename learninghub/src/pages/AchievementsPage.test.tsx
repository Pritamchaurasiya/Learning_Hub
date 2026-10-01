import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import AchievementsPage from './AchievementsPage'
import * as apiModule from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('AchievementsPage Component', () => {
  const mockAchievements = [
    {
      id: 'ach-1',
      name: 'First Blood',
      description: 'Solve your first problem',
      icon: '🎯',
      xp_reward: 50,
      category: 'dsa',
      earned_at: '2026-03-01T10:00:00Z',
    },
    {
      id: 'ach-2',
      name: 'Streak Master',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      xp_reward: 100,
      category: 'streak',
      earned_at: undefined,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiModule.fetchApi).mockResolvedValue({
      data: mockAchievements,
      status: 200,
      success: true,
    })
  })

  it('renders achievements header, stats, and cards', async () => {
    render(<AchievementsPage />)

    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeInTheDocument()
      expect(screen.getByText('First Blood')).toBeInTheDocument()
      expect(screen.getByText('Streak Master')).toBeInTheDocument()
    })

    expect(screen.getByText('1 of 2 achievements unlocked')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('handles empty achievements list gracefully', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValue({
      data: [],
      status: 200,
      success: true,
    })

    render(<AchievementsPage />)

    await waitFor(() => {
      expect(screen.getByText('No achievements yet')).toBeInTheDocument()
    })
  })

  it('handles sharing unlocked achievements via clipboard fallback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
      share: undefined,
    })

    render(<AchievementsPage />)

    await waitFor(() => {
      expect(screen.getByText('First Blood')).toBeInTheDocument()
    })

    const shareButton = screen.getByTitle('Share achievement')
    fireEvent.click(shareButton)

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('First Blood'))
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import ProfilePage from './ProfilePage'
import { userService } from '../services/userService'
import { useStore } from '../stores/useStore'

vi.mock('../services/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    getStats: vi.fn(),
    getAchievements: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}))

describe('ProfilePage Component', () => {
  const mockProfile = {
    id: 'usr-1',
    username: 'AlanTuring',
    email: 'alan@turing.org',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Pioneer of theoretical computer science and AI',
    date_joined: '2026-01-15T00:00:00Z',
    display_name: 'Alan Turing',
    is_verified: true,
    location: null,
    website: null,
  }

  const mockStats = {
    enrolled_courses: 18,
    completed_courses: 14,
    certificates_earned: 5,
    hours_spent: 120,
    level: 6,
    current_streak: 12,
    longest_streak: 25,
    xp_points: 3450,
    next_level_xp: 4000,
    rank: 42,
  }

  const mockAchievements = [
    {
      id: 'ach-1',
      name: 'Algorithm Master',
      description: 'Solved 100 DSA problems',
      icon: '🧠',
      rarity: 'epic',
      unlocked: true,
      unlocked_at: '2026-02-10T12:00:00Z',
    },
    {
      id: 'ach-2',
      name: 'Speed Demon',
      description: 'Finish a contest in top 5',
      icon: '⚡',
      rarity: 'rare',
      unlocked: false,
      unlocked_at: undefined,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      progress: {
        completedCourses: ['crs-1', 'crs-2'],
        currentCourse: null,
        bookmarks: ['bm-1'],
        notes: {},
        streak: 12,
        level: 6,
        xp: 3450,
        lastActive: new Date().toISOString(),
      },
    })

    vi.mocked(userService.getProfile).mockResolvedValue({
      data: mockProfile,
      status: 'success',
    })
    vi.mocked(userService.getStats).mockResolvedValue({
      data: mockStats,
      status: 'success',
    })
    vi.mocked(userService.getAchievements).mockResolvedValue({
      data: mockAchievements as any,
      status: 'success',
    })
    vi.mocked(userService.updateProfile).mockResolvedValue({
      data: { ...mockProfile, bio: 'Updated bio here' },
      status: 'success',
    })
  })

  it('renders profile overview, stats counters, and achievements', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('AlanTuring')).toBeInTheDocument()
      expect(screen.getByText('alan@turing.org')).toBeInTheDocument()
      expect(screen.getByText('Algorithm Master')).toBeInTheDocument()
      expect(screen.getByText('Speed Demon')).toBeInTheDocument()
    })

    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    expect(screen.getByText('Unlocked')).toBeInTheDocument()
    expect(screen.getByText('Locked')).toBeInTheDocument()
  })

  it('toggles edit mode and allows updating bio and saving', async () => {
    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Edit Profile'))

    const bioInput = screen.getByLabelText(/Bio/i)
    fireEvent.change(bioInput, { target: { value: 'Updated AI research bio' } })

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(userService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: 'Updated AI research bio',
        })
      )
    })
  })
})

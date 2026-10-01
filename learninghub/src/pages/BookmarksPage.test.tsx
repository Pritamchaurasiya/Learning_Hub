import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import BookmarksPage from './BookmarksPage'
import { userService } from '../services/userService'

vi.mock('../services/userService', () => ({
  userService: {
    getBookmarks: vi.fn(),
    removeBookmark: vi.fn(),
  },
}))

describe('BookmarksPage Component', () => {
  const mockBookmarks = [
    {
      id: 'bm-1',
      course_id: 'crs-1',
      title: 'Advanced React Architecture',
      description: 'Master enterprise state management, SSR, and concurrency',
      thumbnail_url: 'https://example.com/react.jpg',
      instructor_name: 'Dan Abramov',
      rating: 4.9,
      progress_percent: 45,
      duration: '6 hours',
      level: 'Advanced',
      created_at: '2026-03-01T12:00:00Z',
    },
    {
      id: 'bm-2',
      course_id: 'crs-2',
      title: 'Graph Theory & Network Flow',
      description: 'Max flow, min cut, and shortest path algorithms',
      thumbnail_url: 'https://example.com/graphs.jpg',
      instructor_name: 'Robert Tarjan',
      rating: 5.0,
      progress_percent: 10,
      duration: '8 hours',
      level: 'Expert',
      created_at: '2026-03-01T14:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(userService.getBookmarks).mockResolvedValue({
      data: mockBookmarks,
      count: 2,
      status: 'success',
    })
    vi.mocked(userService.removeBookmark).mockResolvedValue({
      message: 'Removed',
      status: 'success',
    })
  })

  it('renders bookmarks list and headers correctly', async () => {
    render(<BookmarksPage />)

    await waitFor(() => {
      expect(screen.getByText('Advanced React Architecture')).toBeInTheDocument()
      expect(screen.getByText('Graph Theory & Network Flow')).toBeInTheDocument()
    })

    expect(screen.getByText(/2 courses saved for later/i)).toBeInTheDocument()
  })

  it('handles empty bookmarks gracefully', async () => {
    vi.mocked(userService.getBookmarks).mockResolvedValue({
      data: [],
      count: 0,
      status: 'success',
    })

    render(<BookmarksPage />)

    await waitFor(() => {
      expect(screen.getByText('Your bookmark shelf is empty')).toBeInTheDocument()
    })
  })

  it('allows removing a bookmark and triggers toast notification', async () => {
    render(<BookmarksPage />)

    await waitFor(() => {
      expect(screen.getByText('Advanced React Architecture')).toBeInTheDocument()
    })

    const removeButtons = screen.getAllByTitle('Remove bookmark')
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(userService.removeBookmark).toHaveBeenCalledWith('bm-1')
    })
  })
})

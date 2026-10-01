import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import DiscussionsPage from './DiscussionsPage'
import { discussionService } from '../services/discussionService'

vi.mock('../services/discussionService', () => ({
  discussionService: {
    getDiscussions: vi.fn(),
    voteDiscussion: vi.fn(),
    toggleBookmark: vi.fn(),
  },
}))

describe('DiscussionsPage Component', () => {
  const mockDiscussions = [
    {
      id: 'disc-1',
      title: 'How to optimize Dijkstra algorithm for dense graphs?',
      content: 'I am wondering whether Fibonacci heaps are worth implementing...',
      author: {
        id: 'usr-1',
        username: 'adalovelace',
        display_name: 'Ada Lovelace',
        avatar_url: 'https://example.com/ada.jpg',
      },
      course: {
        id: 'crs-1',
        title: 'Computer Science',
      },
      tags: ['algorithms', 'graphs', 'Computer Science'],
      like_count: 24,
      reply_count: 8,
      view_count: 120,
      user_vote: 0,
      is_bookmarked: false,
      is_pinned: false,
      is_resolved: false,
      created_at: '2026-03-01T12:00:00Z',
      updated_at: '2026-03-01T12:00:00Z',
    },
    {
      id: 'disc-2',
      title: 'Best practices for React 18 Concurrent Rendering',
      content: 'Exploring transitions and deferred values in production apps.',
      author: {
        id: 'usr-2',
        username: 'dan_a',
        display_name: 'Dan Abramov',
        avatar_url: 'https://example.com/dan.jpg',
      },
      course: {
        id: 'crs-2',
        title: 'Web Development',
      },
      tags: ['react', 'frontend', 'Web Development'],
      like_count: 45,
      reply_count: 14,
      view_count: 350,
      user_vote: 1,
      is_bookmarked: true,
      is_pinned: false,
      is_resolved: false,
      created_at: '2026-03-01T14:00:00Z',
      updated_at: '2026-03-01T14:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(discussionService.getDiscussions).mockResolvedValue({
      data: mockDiscussions,
      status: 'success',
    })
  })

  it('renders discussions page header, list, categories, and items', async () => {
    render(<DiscussionsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Discussions$/i, level: 1 })).toBeInTheDocument()
      expect(
        screen.getByText('How to optimize Dijkstra algorithm for dense graphs?')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Best practices for React 18 Concurrent Rendering')
      ).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /^Web Development$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Computer Science$/i })).toBeInTheDocument()
  })

  it('filters discussions when clicking a category chip', async () => {
    render(<DiscussionsPage />)

    await waitFor(() => {
      expect(
        screen.getByText('How to optimize Dijkstra algorithm for dense graphs?')
      ).toBeInTheDocument()
    })

    const webDevChip = screen.getByRole('button', { name: /^Web Development$/i })
    fireEvent.click(webDevChip)

    await waitFor(() => {
      expect(
        screen.getByText('Best practices for React 18 Concurrent Rendering')
      ).toBeInTheDocument()
      expect(
        screen.queryByText('How to optimize Dijkstra algorithm for dense graphs?')
      ).not.toBeInTheDocument()
    })
  })
})

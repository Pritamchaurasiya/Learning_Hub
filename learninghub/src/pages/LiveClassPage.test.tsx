import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import LiveClassPage from './LiveClassPage'

vi.mock('../services/liveClassService', () => ({
  liveClassService: {
    getAllSessions: vi.fn().mockResolvedValue({
      status: 'success',
      data: [
        {
          id: 'session-1',
          title: 'Graph Theory & Dijkstra Algorithm Workshop',
          instructorName: 'Dr. Sarah Chen',
          scheduledAt: new Date().toISOString(),
          durationMinutes: 90,
          status: 'live',
          maxParticipants: 100,
          currentParticipants: 45,
        },
        {
          id: 'session-2',
          title: 'Dynamic Programming Masterclass',
          instructorName: 'Prof. Alan Turing',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 60,
          status: 'upcoming',
          maxParticipants: 150,
          currentParticipants: 20,
        },
      ],
      count: 2,
    }),
  },
}))

describe('LiveClassPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders live class lobby with sessions, search, and status filter buttons', async () => {
    render(<LiveClassPage />)

    await waitFor(() => {
      expect(screen.getByText(/Graph Theory & Dijkstra Algorithm Workshop/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Dynamic Programming Masterclass/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search live classes/i)).toBeInTheDocument()
  })

  it('filters sessions by search query', async () => {
    render(<LiveClassPage />)

    await waitFor(() => {
      expect(screen.getByText(/Graph Theory & Dijkstra Algorithm Workshop/i)).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search live classes/i)
    fireEvent.change(searchInput, { target: { value: 'Graph' } })

    expect(screen.getByText(/Graph Theory & Dijkstra Algorithm Workshop/i)).toBeInTheDocument()
    expect(screen.queryByText(/Dynamic Programming Masterclass/i)).not.toBeInTheDocument()
  })

  it('switches between lobby filter tabs', async () => {
    render(<LiveClassPage />)

    await waitFor(() => {
      expect(screen.getByText(/Graph Theory & Dijkstra Algorithm Workshop/i)).toBeInTheDocument()
    })

    const liveTab = screen.getByRole('button', { name: /live now/i })
    fireEvent.click(liveTab)

    expect(screen.getByText(/Graph Theory & Dijkstra Algorithm Workshop/i)).toBeInTheDocument()
    expect(screen.queryByText(/Dynamic Programming Masterclass/i)).not.toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import MentorshipPage from './MentorshipPage'

vi.mock('../services/mentorService', () => ({
  mentorService: {
    getMentors: vi.fn().mockResolvedValue({
      status: 'success',
      data: [
        {
          id: 'm-1',
          user: {
            id: 'u-1',
            username: 'dr_elena_rostova',
            display_name: 'Dr. Elena Rostova',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          },
          expertise: ['AI & Machine Learning', 'Distributed Systems'],
          bio: 'Principal AI Research Scientist.',
          hourly_rate: 120,
          rating: 4.98,
          total_reviews: 142,
          is_available: true,
          availability: [{ day: 'Monday', start_time: '14:00', end_time: '18:00' }],
          created_at: new Date().toISOString(),
        },
      ],
      count: 1,
    }),
    getMySessions: vi.fn().mockResolvedValue({
      status: 'success',
      data: [],
      count: 0,
    }),
    bookSession: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        id: 'sess-1',
        mentor: {
          id: 'm-1',
          user: { id: 'u-1', username: 'dr_elena_rostova', display_name: 'Dr. Elena Rostova' },
          expertise: ['AI & Machine Learning'],
          bio: 'Principal AI Research Scientist.',
          hourly_rate: 120,
          rating: 4.98,
          total_reviews: 142,
          is_available: true,
          availability: [],
          created_at: new Date().toISOString(),
        },
        student: { id: 'u-2', username: 'student', display_name: 'Student' },
        scheduled_at: new Date().toISOString(),
        duration_minutes: 45,
        status: 'scheduled',
        topic: 'AI Architecture',
        created_at: new Date().toISOString(),
      },
    }),
  },
}))

describe('MentorshipPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders mentorship header banner and search bar', async () => {
    render(<MentorshipPage />)
    expect(screen.getByText(/1-on-1 Expert Mentorship Hub/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search by mentor name, topic, or company.../i)).toBeInTheDocument()
  })

  it('renders mentor card with rating and hourly rate', async () => {
    render(<MentorshipPage />)
    await waitFor(() => {
      expect(screen.getByText('Dr. Elena Rostova')).toBeInTheDocument()
    })
    expect(screen.getByText(/\$120 \/ hour/i)).toBeInTheDocument()
    expect(screen.getByText('Book Session')).toBeInTheDocument()
  })

  it('switches between Explore Mentors and My Booked Sessions tabs', async () => {
    render(<MentorshipPage />)
    const sessionsTabBtn = screen.getByRole('button', { name: /My Booked Sessions/i })
    fireEvent.click(sessionsTabBtn)
    await waitFor(() => {
      expect(screen.getByText(/Upcoming & Past Mentorship Sessions/i)).toBeInTheDocument()
    })
  })
})

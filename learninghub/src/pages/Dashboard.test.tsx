import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import Dashboard from './Dashboard'
import * as apiModule from '../utils/api'
import { useStore } from '../stores/useStore'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

vi.mock('../components/AILearningEngine', () => ({
  default: () => <div data-testid="ai-learning-engine">AILearningEngine</div>,
}))

describe('Dashboard Component', () => {
  const mockProfileResponse = {
    data: {
      user: {
        id: 'usr-1',
        username: 'Ada Lovelace',
        xp: 1250,
        level: 4,
        streak: 7,
      },
    },
  }

  const mockAttemptsResponse = {
    data: {
      results: [
        {
          id: 'att-1',
          status: 'COMPLETED',
          score: 85,
          passed: true,
          completedAt: '2026-03-01T12:00:00Z',
          test: { title: 'Algorithms & Data Structures Assessment' },
        },
      ],
    },
  }

  const mockRecommendations = {
    data: [
      {
        id: 'rec-1',
        title: 'Master Dynamic Programming',
        category: 'dsa',
        reason: 'Recommended based on recent quiz scores',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      auth: {
        isAuthenticated: true,
        user: {
          id: 'usr-1',
          username: 'Ada Lovelace',
          email: 'ada@example.com',
          role: 'STUDENT',
          xp: 1250,
          level: 4,
          streak: 7,
          lastActive: new Date().toISOString(),
        },
        isHydrated: true,
      },
      progress: {
        completedCourses: [],
        currentCourse: null,
        xp: 1250,
        level: 4,
        streak: 7,
        bookmarks: [],
        notes: {},
        lastActive: new Date().toISOString(),
      },
    })

    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/auth/me')) return mockProfileResponse
      if (url.includes('/tests/attempts')) return mockAttemptsResponse
      if (url.includes('/recommendations')) return mockRecommendations
      return { data: null }
    })
  })

  it('renders dashboard welcome header, stats cards, and AI trigger button', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Ada Lovelace/i)).toBeInTheDocument()
      expect(screen.getByText(/Generate Custom AI Test|Generate AI Test/i)).toBeInTheDocument()
    })

    expect(screen.getAllByText(/Level 4/i)[0]).toBeInTheDocument()
    expect(screen.getByText(/Algorithms & Data Structures Assessment/i)).toBeInTheDocument()
  })

  it('opens AI Test Generator modal when trigger button is clicked', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Generate Custom AI Test|Generate AI Test/i)).toBeInTheDocument()
    })

    const generateButton = screen.getByText(/Generate Custom AI Test|Generate AI Test/i)
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('AI Dynamic Test Generation')).toBeInTheDocument()
    })
  })
})

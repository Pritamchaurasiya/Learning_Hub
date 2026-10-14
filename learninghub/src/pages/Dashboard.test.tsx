import type { ReactNode } from 'react'
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

// Mock recharts to avoid ResizeObserver issues in test environment
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    AreaChart: ({ children }: { children: ReactNode }) => (
      <div data-testid="area-chart">{children}</div>
    ),
    RadarChart: ({ children }: { children: ReactNode }) => (
      <div data-testid="radar-chart">{children}</div>
    ),
    Area: () => null,
    Radar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    PolarGrid: () => null,
    PolarAngleAxis: () => null,
  }
})

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
        {
          id: 'att-2',
          status: 'COMPLETED',
          score: 45,
          passed: false,
          completedAt: '2026-02-28T10:00:00Z',
          test: { title: 'Dynamic Programming Deep Dive' },
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

  it('renders recent test results including passed and failed assessments', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Algorithms & Data Structures Assessment/i)).toBeInTheDocument()
    })

    // Check that the pass/fail statuses are rendered
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText(/Dynamic Programming Deep Dive/i)).toBeInTheDocument()
  })

  it('renders all four core stat tiles with correct data', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    })

    // Assessments taken
    expect(screen.getByText('Assessments Taken')).toBeInTheDocument()
    // Pass rate
    expect(screen.getByText('Pass Rate')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    // XP (appears in stat tile, level progress, and next action card)
    expect(screen.getAllByText(/XP/i).length).toBeGreaterThanOrEqual(1)
    // Streak
    expect(screen.getByText('Continuous Study Streak')).toBeInTheDocument()
  })

  it('renders the AI Learning Engine and weekly accuracy section', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    })

    expect(screen.getByTestId('ai-learning-engine')).toBeInTheDocument()
    expect(screen.getByText(/Weekly Accuracy Trend/i)).toBeInTheDocument()
  })

  it('recommends a weak topic only when real analytics contain enough attempts', async () => {
    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/auth/me')) return mockProfileResponse
      if (url.includes('/tests/attempts')) return mockAttemptsResponse
      if (url.includes('/user-analytics/me')) {
        return {
          status: 'success',
          data: {
            summary: {
              totalTestsCompleted: 2,
              totalQuestionsAnswered: 20,
              overallAccuracy: 61,
              averageScore: 65,
              passRate: 50,
              totalStudyTimeMinutes: 30,
              currentStreak: 7,
              longestStreak: 10,
            },
            accuracyTrend: [
              { date: 'Mon', accuracy: 45, testsCompleted: 1 },
              { date: 'Tue', accuracy: 61, testsCompleted: 1 },
            ],
            speedTrend: [],
            topicMastery: {
              'dynamic-programming': {
                topicName: 'Dynamic Programming',
                accuracy: 42,
                totalAttempts: 6,
              },
              'arrays': { topicName: 'Arrays', accuracy: 78, totalAttempts: 12 },
            },
            growth: {
              growthScore: 22,
              accuracyDelta: -3,
              speedDelta: 0,
              consistencyScore: 60,
            },
          },
        }
      }
      return { data: null }
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Recommended focus: Dynamic Programming/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/42% accuracy across 6 attempts/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Open practice hub/i })).toBeInTheDocument()
  })

  it('shows an honest first-assessment state when no tests are completed', async () => {
    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/auth/me')) return mockProfileResponse
      if (url.includes('/tests/attempts')) return { data: { results: [] } }
      return { data: null }
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/No completed assessments yet/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Start your first practice test/i })).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/Dynamic Programming Deep Dive/i)).not.toBeInTheDocument()
  })
})

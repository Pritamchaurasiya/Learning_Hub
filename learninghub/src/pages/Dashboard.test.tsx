import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import { render } from '../test/test-utils'
import Dashboard from './Dashboard'
import * as apiModule from '../utils/api'
import { useStore } from '../stores/useStore'
import { useLearningContextStore } from '../stores/useLearningContextStore'

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
    expect(screen.getByText('Overall Accuracy Rate')).toBeInTheDocument()
    // XP (appears in stat tile, level progress, and next action card)
    expect(screen.getAllByText(/XP/i).length).toBeGreaterThanOrEqual(1)
    // Streak
    expect(screen.getByText('Continuous Study Streak')).toBeInTheDocument()
  })

  it('renders the AI Learning Engine and 7-day area chart section', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    })

    expect(screen.getByTestId('ai-learning-engine')).toBeInTheDocument()
    expect(screen.getByText(/7-Day Accuracy/i)).toBeInTheDocument()
  })

  it('renders Pro upsell conversion banner with flash offer discount and upgrade CTA', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('pro-upsell-banner')).toBeInTheDocument()
      expect(screen.getByText(/Scholar Pro Flash Offer • 40% OFF/i)).toBeInTheDocument()
      expect(screen.getByText(/Unlock All 15\+ Advanced AI Simulators/i)).toBeInTheDocument()
      expect(screen.getByText(/Claim 40% Off & Upgrade/i)).toBeInTheDocument()
    })
  })

  it('renders Daily Momentum Quests with habit checklist and interactive progress tracking', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('daily-momentum-quest-widget')).toBeInTheDocument()
      expect(screen.getByText(/Daily Momentum Quests/i)).toBeInTheDocument()
      expect(screen.getByText(/Run 1 Adaptive Diagnostic Test/i)).toBeInTheDocument()
      expect(screen.getByText(/Complete 1 Pomodoro Deep Work Sprint/i)).toBeInTheDocument()
    })
  })

  it('renders Career ROI & Placement Value calculator with role benchmarks', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('career-roi-calculator-widget')).toBeInTheDocument()
      expect(screen.getByText(/Career ROI & Placement Value Calculator/i)).toBeInTheDocument()
      expect(screen.getByText(/Projected Median Comp/i)).toBeInTheDocument()
      expect(screen.getByText(/Accelerate Readiness/i)).toBeInTheDocument()
    })
  })

  it('renders Live Peer Activity ticker with active learner presence', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('live-peer-activity-ticker')).toBeInTheDocument()
      expect(screen.getByText(/1,842 learners active now/i)).toBeInTheDocument()
    })
  })

  it('renders Scholar Onboarding Tour Card with endowed progress and triggers AI modal on action', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('scholar-onboarding-tour-card')).toBeInTheDocument()
      expect(screen.getByText(/Fast-Track Orientation/i)).toBeInTheDocument()
      expect(screen.getByText(/Launch First AI Test/i)).toBeInTheDocument()
    })

    const launchButton = screen.getByText(/Launch First AI Test/i)
    fireEvent.click(launchButton)

    await waitFor(() => {
      expect(screen.getByText('AI Dynamic Test Generation')).toBeInTheDocument()
    })
  })

  it('opens Milestone Reward Modal when Claim Loot is clicked and equips rewards', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Claim Loot/i)).toBeInTheDocument()
    })

    const claimLootBtn = screen.getByText(/Claim Loot/i)
    fireEvent.click(claimLootBtn)

    await waitFor(() => {
      const modal = screen.getByTestId('milestone-reward-modal')
      expect(modal).toBeInTheDocument()
      expect(within(modal).getByText(/Scholar Prestige Rewards/i)).toBeInTheDocument()
      expect(within(modal).getByText(/2.0x Double XP/i)).toBeInTheDocument()
      expect(within(modal).getByText(/1-Week Streak Shield/i)).toBeInTheDocument()
    })

    const equipBtn = screen.getByRole('button', { name: /equip rewards & continue/i })
    fireEvent.click(equipBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('milestone-reward-modal')).not.toBeInTheDocument()
    })
  })

  it('renders honest empty state for new student with zero test history and diagnostic next action', async () => {
    useStore.setState({
      auth: {
        isAuthenticated: true,
        user: {
          id: 'usr-new',
          username: 'New Scholar',
          email: 'new@example.com',
          role: 'STUDENT',
          xp: 0,
          level: 1,
          streak: 0,
          lastActive: new Date().toISOString(),
        },
        isHydrated: true,
      },
      progress: {
        completedCourses: [],
        currentCourse: null,
        xp: 0,
        level: 1,
        streak: 0,
        bookmarks: [],
        notes: {},
        lastActive: new Date().toISOString(),
      },
    })

    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/auth/me')) {
        return {
          data: { user: { id: 'usr-new', username: 'New Scholar', xp: 0, level: 1, streak: 0 } },
        }
      }
      if (url.includes('/tests/attempts')) {
        return { data: { results: [] } }
      }
      return { data: null }
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, New Scholar/i)).toBeInTheDocument()
    })

    // Zero metrics
    expect(screen.getAllByText('Start Today').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Start your first practice test')).toBeInTheDocument()
    expect(
      screen.getByText(/Your first scorecard and learning insights will appear here/i)
    ).toBeInTheDocument()
  })

  it('personalizes syllabus and recommendations for an SSC CGL candidate without showing unrelated DSA content', async () => {
    useLearningContextStore.setState({
      activeExam: {
        id: 'exam-ssc-cgl',
        name: 'SSC CGL',
        slug: 'ssc-cgl',
        countryId: 'country-in',
        subjects: [
          { id: 's-1', name: 'Quantitative Aptitude', slug: 'quant' },
          { id: 's-2', name: 'General Intelligence & Reasoning', slug: 'reasoning' },
        ],
      },
      activeSubjects: [
        { id: 's-1', name: 'Quantitative Aptitude', slug: 'quant' },
        { id: 's-2', name: 'General Intelligence & Reasoning', slug: 'reasoning' },
      ],
      examAuthority: 'Staff Selection Commission (SSC)',
      preparationStage: 'INTERMEDIATE',
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/SSC CGL Preparation & Syllabus Mastery/i)).toBeInTheDocument()
    })

    expect(screen.getAllByText('Quantitative Aptitude').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('General Intelligence & Reasoning').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText(/Staff Selection Commission \(SSC\)/i).length
    ).toBeGreaterThanOrEqual(1)

    // Assert NO unrelated DSA keywords appear in Next Best Action
    expect(screen.queryByText(/Dynamic Programming Knapsack Patterns/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Binary Trees/i)).not.toBeInTheDocument()
  })

  it('supports multiple target exams and displays switcher pills', async () => {
    useLearningContextStore.setState({
      activeExam: {
        id: 'exam-jee-main',
        name: 'JEE Main',
        slug: 'jee-main',
        countryId: 'country-in',
      },
      targetExams: [
        { id: 'exam-jee-main', name: 'JEE Main', slug: 'jee-main', countryId: 'country-in' },
        { id: 'exam-bitsat', name: 'BITSAT', slug: 'bitsat', countryId: 'country-in' },
      ],
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getAllByText('BITSAT')[0]).toBeInTheDocument()
    })
  })

  it('renders gracefully when analytics API fails or returns offline', async () => {
    vi.mocked(apiModule.fetchApi).mockImplementation(async (url: string) => {
      if (url.includes('/user-analytics/me')) throw new Error('Network Error')
      if (url.includes('/auth/me')) return mockProfileResponse
      if (url.includes('/tests/attempts')) return mockAttemptsResponse
      return { data: null }
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Ada Lovelace/i)).toBeInTheDocument()
    })

    // Dashboard remains responsive and rendered without crashing
    expect(screen.getByTestId('smart-learning-tools-widget')).toBeInTheDocument()
    expect(screen.getByTestId('exam-preparation-overview-widget')).toBeInTheDocument()
  })
})

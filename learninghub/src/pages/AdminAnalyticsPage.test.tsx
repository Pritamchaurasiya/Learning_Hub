import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import AdminAnalyticsPage from './AdminAnalyticsPage'
import { adminService } from '../services/adminService'
import { fetchApi } from '../utils/api'

vi.mock('../services/adminService', () => ({
  adminService: {
    getUserAnalytics: vi.fn(),
    getCourseAnalytics: vi.fn(),
  },
}))

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

describe('AdminAnalyticsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(adminService.getUserAnalytics).mockResolvedValue({
      status: 'success',
      data: {
        growth: [
          { date: '2026-03-01', count: 12 },
          { date: '2026-03-02', count: 25 },
        ],
        byRole: [
          { role: 'STUDENT', count: 120 },
          { role: 'ADMIN', count: 5 },
        ],
      },
    } as any)

    vi.mocked(adminService.getCourseAnalytics).mockResolvedValue({
      status: 'success',
      data: {
        popular: [
          { title: 'DSA Mastery', enrollments: 120 },
          { title: 'React 18 Pro', enrollments: 95 },
        ],
        byCategory: [
          { category: 'Computer Science', count: 40 },
          { category: 'Mathematics', count: 25 },
        ],
      },
    } as any)

    vi.mocked(fetchApi).mockResolvedValue({
      status: 'success',
      data: [
        { date: '2026-03-01', activeUsers: 45 },
        { date: '2026-03-02', activeUsers: 60 },
      ],
    } as any)
  })

  it('renders analytics title, subtitle, and primary dashboard sections', async () => {
    render(<AdminAnalyticsPage />)

    expect(screen.getByText('Detailed Analytics')).toBeInTheDocument()
    expect(
      screen.getByText(/Deep insights into platform growth, user engagement, and course performance/i)
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('User Registration Growth')).toBeInTheDocument()
      expect(screen.getByText('Daily Active Users (30 Days)')).toBeInTheDocument()
      expect(screen.getByText('User Role Distribution')).toBeInTheDocument()
      expect(screen.getByText('Top Enrolled Courses')).toBeInTheDocument()
      expect(screen.getByText('Course Category Breakdown')).toBeInTheDocument()
    })
  })

  it('fetches DAU data and passes it gracefully to chart container', async () => {
    render(<AdminAnalyticsPage />)

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith('/admin/analytics/dau?days=30')
    })

    await waitFor(() => {
      const containers = screen.getAllByTestId('responsive-container')
      expect(containers.length).toBeGreaterThanOrEqual(1)
    })
  })
})

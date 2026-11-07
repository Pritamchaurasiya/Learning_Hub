import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'
import AdminPage from './AdminPage'
import { adminService } from '../services/adminService'
import { fetchApi } from '../utils/api'

vi.mock('../services/adminService', () => ({
  adminService: {
    getUsers: vi.fn(),
    getCourses: vi.fn(),
    getCourseAnalytics: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn(),
    generateCourse: vi.fn(),
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

describe('AdminPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(fetchApi).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/admin/dashboard') {
        return {
          status: 'success',
          data: {
            total_users: 1420,
            active_users_24h: 380,
            total_courses: 45,
            test_submissions_24h: 120,
            new_users_today: 18,
            recent_completions: 34,
            total_enrollments: 2890,
            passed: 95,
          },
        } as any
      }
      return { status: 'success', data: {} } as any
    })

    vi.mocked(adminService.getUsers).mockResolvedValue({
      status: 'success',
      data: {
        users: [
          {
            id: 'u-1',
            email: 'learner1@example.com',
            username: 'Learner One',
            role: 'STUDENT',
            xp: 500,
            level: 3,
            streak: 7,
            created_at: '2026-01-01T00:00:00Z',
            is_active: true,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    } as any)

    vi.mocked(adminService.getCourses).mockResolvedValue({
      status: 'success',
      data: [
        {
          id: 'c-1',
          title: 'Distributed Systems In Go',
          description: 'Production systems engineering',
          category: 'Backend',
          level: 'advanced',
          difficulty: 'HARD',
          isPublished: true,
          published: true,
          status: 'published',
          enrolledCount: 350,
        },
      ],
    } as any)

    vi.mocked(adminService.getCourseAnalytics).mockResolvedValue({
      status: 'success',
      data: {
        popular: [{ id: 'c-1', title: 'Distributed Systems In Go', enrollments: 350 }],
        byCategory: [{ category: 'Backend', count: 12 }],
      },
    } as any)
  })

  it('renders the admin command center header and all navigation tabs', async () => {
    render(<AdminPage />)

    expect(screen.getByText('Admin Command Center')).toBeInTheDocument()
    expect(screen.getByText('Manage users, content, and system configuration')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /^overview$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^courses$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^users$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^analytics$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^experiments$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^security$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ai-lab$/i })).toBeInTheDocument()
  })

  it('displays overview quick stats populated from /admin/dashboard', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Learners')).toBeInTheDocument()
      expect(screen.getByText('1420')).toBeInTheDocument()
      expect(screen.getByText('Active Today')).toBeInTheDocument()
      expect(screen.getByText('380')).toBeInTheDocument()
    })
  })

  it('switches to courses tab and allows opening the create course modal', async () => {
    render(<AdminPage />)

    const coursesTab = screen.getByRole('button', { name: /^courses$/i })
    fireEvent.click(coursesTab)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search courses by name or id/i)).toBeInTheDocument()
    })

    const createBtn = screen.getByRole('button', { name: /create course/i })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(screen.getByText('New Course Master')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/e\.g\. Distributed Systems in Go/i)).toBeInTheDocument()
    })
  })

  it('switches to security and ai-lab tabs gracefully', async () => {
    render(<AdminPage />)

    const securityTab = screen.getByRole('button', { name: /^security$/i })
    fireEvent.click(securityTab)

    await waitFor(() => {
      expect(screen.getByText(/Two-Factor Authentication \(2FA\)/i)).toBeInTheDocument()
    })

    const aiLabTab = screen.getByRole('button', { name: /^ai-lab$/i })
    fireEvent.click(aiLabTab)

    await waitFor(() => {
      expect(screen.getByText('AI Course Workshop')).toBeInTheDocument()
    })
  })
})

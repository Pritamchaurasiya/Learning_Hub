import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { render } from '../test/test-utils'
import StudyPlannerPage from './StudyPlannerPage'
import { studyGoalsService } from '../services/studyGoalsService'
import { studyPlannerService } from '../services/studyPlannerService'
import { analyticsService } from '../services/analyticsService'

vi.mock('../services/studyGoalsService', () => ({
  studyGoalsService: {
    getGoals: vi.fn(),
  },
}))

vi.mock('../services/studyPlannerService', () => ({
  studyPlannerService: {
    getTasks: vi.fn(),
    getTodayTasks: vi.fn(),
    getUpcomingTasks: vi.fn(),
    createTask: vi.fn(),
    completeTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}))

vi.mock('../services/analyticsService', () => ({
  analyticsService: {
    getKnowledgeGraph: vi.fn(),
  },
}))

describe('StudyPlannerPage Component', () => {
  const mockGoals = [
    {
      id: 'g-1',
      title: 'Complete Graph Algorithms & DP Mastery',
      deadline: '2026-04-01',
      progress: 75,
    },
  ]

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Solve 5 Hard LeetCode DP Problems',
      priority: 'high',
      status: 'pending',
      scheduled_date: '2026-03-05',
      duration_minutes: 60,
      course: { title: 'Dynamic Programming Masterclass' },
    },
    {
      id: 'task-2',
      title: 'Review System Design Microservices',
      priority: 'medium',
      status: 'completed',
      scheduled_date: '2026-03-04',
      duration_minutes: 45,
    },
  ]

  const mockKnowledgeGraph = {
    nodes: [
      {
        id: 'node-1',
        title: 'Binary Search Trees',
        description: 'Self-balancing trees',
        level: 1,
        status: 'MASTERED',
        prerequisites: [],
        masteryScore: 90,
      },
    ],
    edges: [],
    recommendedConceptId: 'node-1',
    overallProgressPercentage: 85,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(studyGoalsService.getGoals).mockResolvedValue({
      data: mockGoals,
      status: 'success',
    } as any)
    vi.mocked(studyPlannerService.getTasks).mockResolvedValue({
      data: mockTasks,
      status: 'success',
    } as any)
    vi.mocked(studyPlannerService.completeTask).mockResolvedValue({
      data: { success: true },
      status: 'success',
    } as any)
    vi.mocked(studyPlannerService.deleteTask).mockResolvedValue({
      data: { success: true },
      status: 'success',
    } as any)
    vi.mocked(studyPlannerService.createTask).mockResolvedValue({
      data: { id: 'task-new', title: 'New Protocol' },
      status: 'success',
    } as any)
    vi.mocked(analyticsService.getKnowledgeGraph).mockResolvedValue({
      data: mockKnowledgeGraph,
      status: 'success',
    } as any)
  })

  it('renders strategy planner title, pomodoro focus engine, goals, and tasks', async () => {
    render(<StudyPlannerPage />)

    await waitFor(() => {
      expect(screen.getByText('Strategy Planner')).toBeInTheDocument()
      expect(screen.getByText('Focus Engine')).toBeInTheDocument()
      expect(screen.getByText('Complete Graph Algorithms & DP Mastery')).toBeInTheDocument()
      expect(screen.getByText('Solve 5 Hard LeetCode DP Problems')).toBeInTheDocument()
    })

    expect(screen.getByText('Start Focus')).toBeInTheDocument()
  })

  it('allows starting and pausing the pomodoro focus timer', async () => {
    render(<StudyPlannerPage />)

    await waitFor(() => {
      expect(screen.getByText('Start Focus')).toBeInTheDocument()
    })

    const startButton = screen.getByText('Start Focus')
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument()
    })
  })

  it('opens Create Task Modal when New Task is clicked and submits', async () => {
    render(<StudyPlannerPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Task/i })).toBeInTheDocument()
    })

    const newTaskBtn = screen.getByRole('button', { name: /New Task/i })
    fireEvent.click(newTaskBtn)

    expect(screen.getByText('Add Study Task / Goal')).toBeInTheDocument()

    const titleInput = screen.getByPlaceholderText(/Revise Computer Networks/i)
    fireEvent.change(titleInput, { target: { value: 'Revise Operating Systems' } })

    const submitBtn = screen.getByRole('button', { name: /Add to Schedule/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(studyPlannerService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Revise Operating Systems',
        })
      )
    })
  })

  it('automatically imports notice deadline into study schedule when deep linked via URL params', async () => {
    render(<StudyPlannerPage />, {
      route: '/study-planner?syncUpdate=upd-bca-exam&title=BCA+Exam+Form+Deadline&deadline=2026-10-25',
    })

    await waitFor(() => {
      expect(studyPlannerService.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'BCA Exam Form Deadline',
          scheduled_date: '2026-10-25',
          priority: 'high',
        })
      )
    })
  })
})

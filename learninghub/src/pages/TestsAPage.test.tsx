import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test/test-utils'
import TestsAPage from './TestsAPage'
import { testsAService } from '../services/testsAService'
import { useStore } from '../stores/useStore'

vi.mock('../services/testsAService', () => ({
  testsAService: {
    getTests: vi.fn(),
    checkAccess: vi.fn().mockResolvedValue({ hasAccess: true }),
    startTest: vi.fn(),
    batchAutosave: vi.fn(),
  },
}))

const mockTests = [
  {
    id: 'test-1',
    title: 'Full-Stack Web Development Mock Exam',
    description: 'Comprehensive test covering React, Node.js, and TypeScript architectures.',
    difficulty: 'medium',
    time_limit_minutes: 45,
    question_count: 20,
    passing_score: 70,
    mode: 'mock',
  },
  {
    id: 'test-2',
    title: 'Algorithms & Data Structures Challenge',
    description: 'Solve real-world algorithm problems under timed examination conditions.',
    difficulty: 'hard',
    time_limit_minutes: 60,
    question_count: 15,
    passing_score: 75,
    mode: 'practice',
  },
]

describe('TestsAPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders tests catalog and header after loading', async () => {
    vi.mocked(testsAService.getTests).mockResolvedValue({
      status: 'success',
      data: mockTests as any,
    })

    render(<TestsAPage />)

    await waitFor(() => {
      expect(screen.getByText('Tests A+')).toBeInTheDocument()
      expect(screen.getByText('Full-Stack Web Development Mock Exam')).toBeInTheDocument()
      expect(screen.getByText('Algorithms & Data Structures Challenge')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /AI Custom Mock/i })).toBeInTheDocument()
    })
  })

  it('filters tests by search input', async () => {
    vi.mocked(testsAService.getTests).mockResolvedValue({
      status: 'success',
      data: mockTests as any,
    })

    render(<TestsAPage />)

    await waitFor(() => {
      expect(screen.getByText('Full-Stack Web Development Mock Exam')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search tests/i)
    fireEvent.change(searchInput, { target: { value: 'Challenge' } })

    expect(screen.getByText('Algorithms & Data Structures Challenge')).toBeInTheDocument()
    expect(screen.queryByText('Full-Stack Web Development Mock Exam')).not.toBeInTheDocument()
  })

  it('filters tests by mode and difficulty dropdowns', async () => {
    vi.mocked(testsAService.getTests).mockResolvedValue({
      status: 'success',
      data: mockTests as any,
    })

    render(<TestsAPage />)

    await waitFor(() => {
      expect(screen.getByText('Full-Stack Web Development Mock Exam')).toBeInTheDocument()
    })

    const modeSelect = screen.getByLabelText(/filter by mode/i)
    fireEvent.change(modeSelect, { target: { value: 'practice' } })

    await waitFor(() => {
      expect(screen.getByText('Algorithms & Data Structures Challenge')).toBeInTheDocument()
      expect(screen.queryByText('Full-Stack Web Development Mock Exam')).not.toBeInTheDocument()
    })
  })

  it('renders state-preserving error UI when getTests fails', async () => {
    vi.mocked(testsAService.getTests).mockRejectedValue(new Error('Network connectivity lost'))

    render(<TestsAPage />)

    await waitFor(() => {
      // EmptyState replaces window.location.reload() so answers/timer survive.
      expect(screen.getByText('Could not load tests')).toBeInTheDocument()
      expect(screen.getByText(/Network connectivity lost/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Retry without losing progress/i })
      ).toBeInTheDocument()
    })
  })

  it('renders section switcher and switches active section when sections exist', async () => {
    useStore.setState({
      test: {
        ...useStore.getState().test,
        isActive: true,
        mode: 'tests-a',
        timeRemaining: 1800,
        currentQuestionIndex: 0,
        questions: [
          {
            id: 'q1',
            text: 'Physics Question 1',
            question_type: 'mcq',
            difficulty: 0.5,
            bloom_level: 'understand',
            order: 1,
            marks: 4,
            section_id: 'sec-1',
            options: [
              { id: 'opt1', text: 'Option A', order: 1 },
              { id: 'opt2', text: 'Option B', order: 2 },
            ],
          },
          {
            id: 'q2',
            text: 'Chemistry Question 1',
            question_type: 'mcq',
            difficulty: 0.5,
            bloom_level: 'understand',
            order: 2,
            marks: 4,
            section_id: 'sec-2',
            options: [
              { id: 'opt3', text: 'Option C', order: 1 },
              { id: 'opt4', text: 'Option D', order: 2 },
            ],
          },
        ],
        sections: [
          { id: 'sec-1', title: 'Physics', order: 1, question_count: 1 },
          { id: 'sec-2', title: 'Chemistry', order: 2, question_count: 1 },
        ],
        activeSectionId: 'sec-1',
        answers: {},
        confidences: {},
        flaggedQuestions: [],
        testInfo: {
          testId: 'test-multi',
          testTitle: 'JEE Advanced Mock',
          totalQuestions: 2,
          timeLimit: 30,
        },
      },
    })

    render(<TestsAPage />)

    expect(screen.getByText('Exam Sections (2)')).toBeInTheDocument()
    expect(screen.getAllByText('Physics').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Chemistry/i })).toBeInTheDocument()

    // Question 1 should be active
    expect(screen.getByText('Physics Question 1')).toBeInTheDocument()

    // Click Chemistry section tab
    fireEvent.click(screen.getByRole('button', { name: /Chemistry/i }))

    // Should switch to Question 2 (Chemistry Question 1)
    await waitFor(() => {
      expect(screen.getByText('Chemistry Question 1')).toBeInTheDocument()
    })
  })

  it('disables answer selection and displays lockout alert when active section is locked', async () => {
    useStore.setState({
      test: {
        ...useStore.getState().test,
        isActive: true,
        mode: 'tests-a',
        timeRemaining: 1800,
        currentQuestionIndex: 0,
        questions: [
          {
            id: 'q1',
            text: 'Locked Physics Question',
            question_type: 'mcq',
            difficulty: 0.5,
            bloom_level: 'apply',
            order: 1,
            marks: 4,
            section_id: 'sec-1',
            options: [
              { id: 'opt1', text: 'Option Alpha', order: 1 },
              { id: 'opt2', text: 'Option Beta', order: 2 },
            ],
          },
        ],
        sections: [
          { id: 'sec-1', title: 'Physics', order: 1, question_count: 1, is_locked: true, allow_backward_navigation: false },
        ],
        lockedSectionIds: ['sec-1'],
        activeSectionId: 'sec-1',
        answers: {},
        confidences: {},
        flaggedQuestions: [],
        testInfo: {
          testId: 'test-locked',
          testTitle: 'JEE Mock Locked',
          totalQuestions: 1,
          timeLimit: 30,
        },
      },
    })

    render(<TestsAPage />)

    // Verify locked section alert banner
    expect(screen.getByText('Section Finalized & Locked')).toBeInTheDocument()
    expect(
      screen.getByText(/Answers in this section are sealed and cannot be modified/i)
    ).toBeInTheDocument()

    // Verify section pill displays "Locked"
    expect(screen.getByText('Locked')).toBeInTheDocument()

    // Verify answer option buttons are disabled
    const optionBtn = screen.getByRole('button', { name: /Option Alpha/i })
    expect(optionBtn).toBeDisabled()

    // Clicking option does not record an answer
    fireEvent.click(optionBtn)
    expect(useStore.getState().test.answers['q1']).toBeUndefined()
  })

  it('locks section and records lockedSectionId when Lock Section button is clicked and confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    useStore.setState({
      test: {
        ...useStore.getState().test,
        isActive: true,
        mode: 'tests-a',
        timeRemaining: 1800,
        currentQuestionIndex: 0,
        questions: [
          {
            id: 'q1',
            text: 'Active Physics Question',
            question_type: 'mcq',
            difficulty: 0.5,
            bloom_level: 'apply',
            order: 1,
            marks: 4,
            section_id: 'sec-1',
            options: [
              { id: 'opt1', text: 'Choice 1', order: 1 },
              { id: 'opt2', text: 'Choice 2', order: 2 },
            ],
          },
        ],
        sections: [
          { id: 'sec-1', title: 'Physics Section', order: 1, question_count: 1, is_locked: false },
        ],
        lockedSectionIds: [],
        activeSectionId: 'sec-1',
        answers: {},
        confidences: {},
        flaggedQuestions: [],
        testInfo: {
          testId: 'test-unlock',
          testTitle: 'JEE Test',
          totalQuestions: 1,
          timeLimit: 30,
        },
      },
    })

    render(<TestsAPage />)

    // The Lock Section button should be visible
    const lockButton = screen.getByRole('button', { name: /Lock Section/i })
    expect(lockButton).toBeInTheDocument()

    // Click Lock Section and confirm
    fireEvent.click(lockButton)
    expect(confirmSpy).toHaveBeenCalled()

    // Verify the section is now in lockedSectionIds in store
    expect(useStore.getState().test.lockedSectionIds).toContain('sec-1')
    confirmSpy.mockRestore()
  })

  it('supports cross-feature deep linking with search and auto-opened AI test generator', async () => {
    useStore.getState().resetTestState()

    vi.mocked(testsAService.getTests).mockResolvedValue({
      status: 'success',
      data: mockTests as any,
    })

    render(<TestsAPage />, {
      route: '/tests-a?search=Algorithms&topic=Algorithms&generate=true',
    })

    await waitFor(() => {
      // Search input should have the search param value
      const searchInput = screen.getByPlaceholderText(/search tests/i) as HTMLInputElement
      expect(searchInput.value).toBe('Algorithms')
      // AI Test Generator modal should be opened with topic pre-seeded
      expect(screen.getByText('AI Dynamic Test Generation')).toBeInTheDocument()
    })
  })
})


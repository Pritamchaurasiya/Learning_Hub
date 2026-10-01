import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import { ManualTestCreationModal } from './ManualTestCreationModal'

vi.mock('../services/testsAService', () => ({
  testsAService: {
    createTest: vi.fn(),
  },
}))

describe('ManualTestCreationModal', () => {
  const mockOnClose = vi.fn()
  const mockOnTestCreated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render content when isOpen is false', () => {
    render(
      <ManualTestCreationModal
        isOpen={false}
        onClose={mockOnClose}
        onTestCreated={mockOnTestCreated}
      />
    )
    expect(screen.queryByText(/Manual Test Authoring Wizard/i)).not.toBeInTheDocument()
  })

  it('renders metadata step when isOpen is true', () => {
    render(
      <ManualTestCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTestCreated={mockOnTestCreated}
      />
    )

    expect(screen.getByText(/Manual Test Authoring Wizard/i)).toBeInTheDocument()
    expect(screen.getByText(/Test Title \*/i)).toBeInTheDocument()
    expect(screen.getByText(/Mode/i)).toBeInTheDocument()
    expect(screen.getByText(/Time Limit \(Minutes\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Shuffle Question Sequence/i)).toBeInTheDocument()
    expect(screen.getByText(/Shuffle Option Choices/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next: Add Questions/i })).toBeInTheDocument()
  })

  it('allows navigation between steps after entering title', () => {
    render(
      <ManualTestCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTestCreated={mockOnTestCreated}
      />
    )

    const titleInput = screen.getByPlaceholderText(/Advanced Calculus & Differential Equations Practice/i)
    fireEvent.change(titleInput, { target: { value: 'Organic Chemistry Mock 2026' } })

    const nextBtn = screen.getByRole('button', { name: /Next: Add Questions/i })
    fireEvent.click(nextBtn)

    expect(screen.getByText(/Add Question #1/i)).toBeInTheDocument()
  })

  it('toggles anti-cheat shuffle options and submits them correctly', async () => {
    const { testsAService } = await import('../services/testsAService')
    vi.mocked(testsAService.createTest).mockResolvedValueOnce({
      status: 'success',
      data: {
        id: 'test-shuffled-1',
        title: 'Shuffled Exam',
        description: '',
        exam_name: '',
        exam_code: '',
        country_name: '',
        mode: 'mock',
        difficulty: 'medium',
        time_limit_minutes: 30,
        passing_score: 60,
        total_marks: 4,
        negative_marks_per_question: 0,
        question_count: 1,
        is_ai_generated: false,
        is_featured: false,
        attempt_count: 0,
        created_at: new Date().toISOString(),
        shuffleQuestions: true,
        shuffleOptions: true,
      },
    })

    render(
      <ManualTestCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTestCreated={mockOnTestCreated}
      />
    )

    const titleInput = screen.getByPlaceholderText(/Advanced Calculus & Differential Equations Practice/i)
    fireEvent.change(titleInput, { target: { value: 'Shuffled Exam' } })

    const shuffleQuestionsCheckbox = screen.getByLabelText(/Shuffle Question Sequence/i)
    const shuffleOptionsCheckbox = screen.getByLabelText(/Shuffle Option Choices/i)

    fireEvent.click(shuffleQuestionsCheckbox)
    fireEvent.click(shuffleOptionsCheckbox)

    expect(shuffleQuestionsCheckbox).toBeChecked()
    expect(shuffleOptionsCheckbox).toBeChecked()

    // Move to questions step
    fireEvent.click(screen.getByRole('button', { name: /Next: Add Questions/i }))

    // Fill in question #1
    const qTextInput = screen.getByPlaceholderText(/Type your question prompt here.../i)
    fireEvent.change(qTextInput, { target: { value: 'What is 2 + 2?' } })

    const optionInputs = screen.getAllByPlaceholderText(/Option \d+/i)
    fireEvent.change(optionInputs[0], { target: { value: '4' } })
    fireEvent.change(optionInputs[1], { target: { value: '5' } })

    // Add question
    fireEvent.click(screen.getByRole('button', { name: /Add Question to Test/i }))

    // Publish test
    const publishBtn = screen.getByRole('button', { name: /Publish Test \(1 Questions\)/i })
    fireEvent.click(publishBtn)

    await waitFor(() => {
      expect(testsAService.createTest).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Shuffled Exam',
          shuffleQuestions: true,
          shuffleOptions: true,
        })
      )
    })
  }, 15000)
})


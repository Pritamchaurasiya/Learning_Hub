import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../test/test-utils'
import { AITestGeneratorModal } from './AITestGeneratorModal'

vi.mock('../services/aiTutorService', () => ({
  aiTutorService: {
    generateDiagnosticTest: vi.fn(),
  },
}))

vi.mock('../services/testsAService', () => ({
  testsAService: {
    createAITest: vi.fn(),
  },
}))

describe('AITestGeneratorModal', () => {
  const mockOnClose = vi.fn()
  const mockOnTestGenerated = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render content when isOpen is false', () => {
    render(
      <AITestGeneratorModal
        isOpen={false}
        onClose={mockOnClose}
        onTestGenerated={mockOnTestGenerated}
      />
    )
    expect(screen.queryByText(/AI Dynamic Test Generation/i)).not.toBeInTheDocument()
  })

  it('renders modal controls and options when isOpen is true', () => {
    render(
      <AITestGeneratorModal
        isOpen={true}
        onClose={mockOnClose}
        onTestGenerated={mockOnTestGenerated}
        hasAccess={true}
      />
    )

    expect(screen.getByText('AI Dynamic Test Generation')).toBeInTheDocument()
    expect(screen.getByText(/Subject \/ Topic/i)).toBeInTheDocument()
    expect(screen.getByText(/Base Difficulty/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('allows changing subject/topic input and selecting difficulty', () => {
    render(
      <AITestGeneratorModal
        isOpen={true}
        onClose={mockOnClose}
        onTestGenerated={mockOnTestGenerated}
      />
    )

    const topicInput = screen.getByPlaceholderText(/e\.g\. Advanced Calculus/i)
    fireEvent.change(topicInput, { target: { value: 'Binary Trees' } })
    expect(topicInput).toHaveValue('Binary Trees')

    const diffSelect = screen.getByRole('combobox')
    fireEvent.change(diffSelect, { target: { value: 'hard' } })
    expect(diffSelect).toHaveValue('hard')
  })
})

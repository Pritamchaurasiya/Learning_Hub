import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../test/test-utils'
import { SocraticRemediationFlashcards } from './SocraticRemediationFlashcards'
import { revisionService } from '../../services/revisionService'
import type { TestAttempt } from '../../services/testsAService'

vi.mock('../../services/revisionService', () => ({
  revisionService: {
    createCustomCard: vi.fn().mockResolvedValue({ id: 'card-created-1' }),
  },
}))

const mockAttemptWithMistakes: TestAttempt = {
  id: 'attempt-test-101',
  test: 'test-101',
  test_title: 'System Design & Distributed Algorithms',
  exam_name: 'CS Core',
  mode: 'mock',
  status: 'submitted',
  score: 60,
  total_marks: 100,
  percentage: 60,
  passed: true,
  time_taken_seconds: 1500,
  started_at: '2026-08-20T10:00:00Z',
  submitted_at: '2026-08-20T10:25:00Z',
  attempt_number: 1,
  answers: [
    {
      id: 'ans-1',
      question_id: 'q1',
      question_text: 'Explain Raft leader lease mechanism under asymmetric network splits',
      question_type: 'subjective',
      selected_options: [],
      text_answer: 'Leader leases must be shorter than election timeout to avoid stale reads.',
      is_correct: false,
      marks_obtained: 0,
      time_spent: 90,
      is_flagged: false,
      is_bookmarked: false,
      answered_at: '2026-08-20T10:10:00Z',
      topic: 'Consensus Algorithms',
    },
    {
      id: 'ans-2',
      question_id: 'q2',
      question_text: 'Why does Two-Phase Locking (2PL) prevent cascading rollbacks in strict form?',
      question_type: 'mcq',
      selected_options: [],
      text_answer: 'Strict 2PL holds exclusive locks until commit.',
      is_correct: false,
      marks_obtained: 0,
      time_spent: 45,
      is_flagged: false,
      is_bookmarked: false,
      answered_at: '2026-08-20T10:15:00Z',
      topic: 'Concurrency Control',
    },
  ],
}

describe('SocraticRemediationFlashcards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Socratic active-recall deck with prompt on front', () => {
    render(<SocraticRemediationFlashcards attempt={mockAttemptWithMistakes} />)

    expect(screen.getByText('Socratic Active-Recall Remediation Deck')).toBeInTheDocument()
    expect(screen.getByText(/Active Recall Prompt/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Raft leader lease mechanism under asymmetric network splits/i)
    ).toBeInTheDocument()
  })

  it('flips the card to reveal solution on click', () => {
    render(<SocraticRemediationFlashcards attempt={mockAttemptWithMistakes} />)

    const flipCard = screen.getByTestId('socratic-flashcard-flip')
    fireEvent.click(flipCard)

    expect(screen.getByText('Socratic Synthesis')).toBeInTheDocument()
    expect(
      screen.getByText(/Leader leases must be shorter than election timeout to avoid stale reads/i)
    ).toBeInTheDocument()
  })

  it('reveals and hides Socratic hint when toggled', async () => {
    render(<SocraticRemediationFlashcards attempt={mockAttemptWithMistakes} />)

    const hintToggleBtn = screen.getByRole('button', { name: /Need a Socratic Clue\?/i })
    fireEvent.click(hintToggleBtn)

    expect(screen.getByText(/Recall key principles in Consensus Algorithms/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Hide Socratic Clue/i }))
    await waitFor(() => {
      expect(
        screen.queryByText(/Recall key principles in Consensus Algorithms/i)
      ).not.toBeInTheDocument()
    })
  })

  it('navigates to next and previous cards', () => {
    render(<SocraticRemediationFlashcards attempt={mockAttemptWithMistakes} />)

    expect(screen.getByText(/Card 1 of 2/i)).toBeInTheDocument()

    const nextBtn = screen.getByRole('button', { name: /Next/i })
    fireEvent.click(nextBtn)

    expect(screen.getByText(/Card 2 of 2/i)).toBeInTheDocument()
    expect(screen.getByText(/Two-Phase Locking/i)).toBeInTheDocument()

    const prevBtn = screen.getByRole('button', { name: /Previous/i })
    fireEvent.click(prevBtn)

    expect(screen.getByText(/Card 1 of 2/i)).toBeInTheDocument()
  })

  it('syncs flashcards to Spaced Revision Hub on 1-click export', async () => {
    const handleExport = vi.fn()
    render(
      <SocraticRemediationFlashcards
        attempt={mockAttemptWithMistakes}
        onExportComplete={handleExport}
      />
    )

    const syncBtn = screen.getByRole('button', { name: /Sync to Spaced Revision/i })
    fireEvent.click(syncBtn)

    await waitFor(() => {
      expect(revisionService.createCustomCard).toHaveBeenCalledTimes(2)
      expect(handleExport).toHaveBeenCalledWith(2)
      expect(screen.getByRole('button', { name: /Synced to Revision Hub/i })).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CompetitiveScoringBreakdownCard } from './CompetitiveScoringBreakdownCard'
import { revisionService } from '../../services/revisionService'
import type { TestResult } from '../../services/testsAService'

const mockAddToast = vi.fn()
vi.mock('../ui/Toast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}))

const mockPlayRewardChime = vi.fn()
vi.mock('../../utils/soundEffects', () => ({
  playRewardChime: (...args: unknown[]) => mockPlayRewardChime(...args),
}))

const mockTriggerHaptic = vi.fn()
vi.mock('../../utils/haptics', () => ({
  triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
}))

const mockTestResult: TestResult = {
  attempt_id: 'att-competitive-101',
  test_id: 'test-jee-main-2026',
  test_title: 'JEE Main Full Mock Examination',
  mode: 'exam',
  score: 72,
  total_marks: 100,
  percentage: 72,
  passed: true,
  time_taken: 3600,
  time_limit: 180,
  correct_count: 20,
  incorrect_count: 5,
  unanswered_count: 5,
  question_results: [
    {
      question_id: 'q-jee-1',
      question_text: 'Calculate the de Broglie wavelength of an electron accelerated through 100V.',
      question_type: 'mcq',
      selected_options: [{ id: 'opt-b', text: '0.123 nm' }],
      correct_options: [{ id: 'opt-b', text: '0.123 nm' }],
      is_correct: true,
      marks_obtained: 4,
      explanation: 'lambda = h / sqrt(2mE) = 1.227 / sqrt(V) nm = 0.123 nm.',
      time_spent: 45,
      is_flagged: false,
      topic: 'Modern Physics',
    },
    {
      question_id: 'q-jee-2',
      question_text: 'Find the limit of (sin x - x) / x^3 as x approaches 0.',
      question_type: 'mcq',
      selected_options: [{ id: 'opt-a', text: '0' }],
      correct_options: [{ id: 'opt-c', text: '-1/6' }],
      is_correct: false,
      marks_obtained: -1,
      explanation: 'Taylor expansion of sin x = x - x^3/6 + ... hence limit is -1/6.',
      time_spent: 90,
      is_flagged: false,
      topic: 'Calculus',
    },
    {
      question_id: 'q-jee-3',
      question_text: 'What is the hybridization of XeF4?',
      question_type: 'mcq',
      selected_options: [{ id: 'opt-d', text: 'sp3d' }],
      correct_options: [{ id: 'opt-a', text: 'sp3d2' }],
      is_correct: false,
      marks_obtained: -1,
      explanation: 'Xe has 8 valence electrons + 4 F bonds = 6 electron pairs -> sp3d2 square planar.',
      time_spent: 30,
      is_flagged: false,
      topic: 'Chemical Bonding',
    },
  ],
}

describe('CompetitiveScoringBreakdownCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders CBT competitive scoring breakdown with gross, penalty, and net scores', () => {
    render(<CompetitiveScoringBreakdownCard result={mockTestResult} />)

    expect(screen.getByText('NTA CBT Marking & Rank Calibration')).toBeInTheDocument()
    expect(screen.getByText('+4 / -1 Scheme')).toBeInTheDocument()

    // Gross score: 20 correct * 4 = 80
    expect(screen.getByText('+80')).toBeInTheDocument()
    expect(screen.getByText('20 × 4 marks')).toBeInTheDocument()

    // Negative penalty: 5 incorrect * 1 = -5
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getByText('5 × 1 mark lost')).toBeInTheDocument()

    // Net score: 80 - 5 = 75
    expect(screen.getByText(/75/)).toBeInTheDocument()
  })

  it('displays estimated percentile and projected All India Rank (AIR)', () => {
    render(<CompetitiveScoringBreakdownCard result={mockTestResult} />)

    expect(screen.getByText('Projected AIR')).toBeInTheDocument()
    // Verify AIR number and percentile label exist
    expect(screen.getByText(/%ile \(of 1\.2M\)/)).toBeInTheDocument()
  })

  it('calculates guessing penalty drag and feedback', () => {
    render(<CompetitiveScoringBreakdownCard result={mockTestResult} />)

    // Penalty drag: 5 / 80 = 6%
    expect(screen.getByText(/Guessing Penalty Drag: 6%/)).toBeInTheDocument()
    expect(screen.getByText(/Controlled guesswork/i)).toBeInTheDocument()
  })

  it('exports incorrect questions to Spaced Revision Hub flashcards upon 1-click action', async () => {
    const createSpy = vi.spyOn(revisionService, 'createCustomCard').mockResolvedValue({
      id: 'card-new-1',
      front: 'Question',
      back: 'Answer',
      card_type: 'MISTAKE',
      difficulty: 0.5,
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      lapses: 0,
      stability: 1.0,
      created_at: new Date().toISOString(),
    } as any)

    render(<CompetitiveScoringBreakdownCard result={mockTestResult} />)

    const exportBtn = screen.getByRole('button', { name: /Export 2 Mistakes to Flashcards/i })
    expect(exportBtn).toBeInTheDocument()

    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(2)
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          front: 'Find the limit of (sin x - x) / x^3 as x approaches 0.',
          back: '-1/6',
          card_type: 'MISTAKE',
        })
      )
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          front: 'What is the hybridization of XeF4?',
          back: 'sp3d2',
          card_type: 'MISTAKE',
        })
      )
      expect(mockPlayRewardChime).toHaveBeenCalledWith('quest-complete')
      expect(mockTriggerHaptic).toHaveBeenCalledWith('success')
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.stringContaining('Successfully exported 2 mistake flashcards'),
        'success'
      )
    })

    expect(
      screen.getByText('Exported to Spaced Revision Hub')
    ).toBeInTheDocument()
  })
})

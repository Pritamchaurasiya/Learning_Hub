import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ResultsView } from './ResultsView'
import type { TestResult } from '../../services/testsAService'
import { testsAService } from '../../services/testsAService'

vi.mock('../../services/testsAService', async importOriginal => {
  const actual = await importOriginal<typeof import('../../services/testsAService')>()
  return {
    ...actual,
    testsAService: {
      ...actual.testsAService,
      gradeSubjectiveAnswer: vi.fn(),
      bookmarkQuestion: vi.fn().mockResolvedValue({}),
      removeBookmark: vi.fn().mockResolvedValue({}),
    },
  }
})

vi.mock('../../services/remediationService', () => ({
  analyzeMistakes: vi.fn().mockReturnValue({
    totalMistakes: 1,
    hasSevereWeakness: false,
    categories: [],
    primaryWeaknessLabel: 'General',
    drillRecommendations: [],
  }),
}))

const mockSubjectiveResult: TestResult = {
  attempt_id: 'att-subj-1',
  test_id: 'test-subj-100',
  test_title: 'Full Stack Engineering Assessment',
  mode: 'practice',
  score: 80,
  total_marks: 100,
  percentage: 80,
  passed: true,
  time_taken: 600,
  time_limit: 30,
  correct_count: 1,
  incorrect_count: 0,
  unanswered_count: 0,
  question_results: [
    {
      question_id: 'q-subj-1',
      question_text: 'Explain the difference between optimistic and pessimistic locking in distributed databases.',
      question_type: 'subjective',
      selected_options: [],
      correct_options: [],
      is_correct: null,
      marks_obtained: 0,
      text_answer: 'Optimistic locking assumes conflict is rare and validates on commit. Pessimistic locking locks the resource upfront.',
      ai_feedback: undefined,
      explanation: 'Optimistic locking uses version numbers; pessimistic locking uses DB locks.',
      time_spent: 45,
      is_flagged: false,
    },
  ],
}

describe('ResultsView Subjective AI Grading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Grade with AI Rubric" button for un-graded subjective answers', () => {
    render(
      <ResultsView
        result={mockSubjectiveResult}
        onRetry={vi.fn()}
        onBack={vi.fn()}
      />
    )

    expect(screen.getByText('Subjective AI Rubric Evaluation')).toBeInTheDocument()
    expect(screen.getByText('⚡ Grade with AI Rubric')).toBeInTheDocument()
    expect(screen.getByText(/Optimistic locking assumes conflict is rare/i)).toBeInTheDocument()
  })

  it('triggers gradeSubjectiveAnswer when "Grade with AI Rubric" is clicked', async () => {
    const mockGradeResponse = {
      status: 'success',
      data: {
        questionId: 'q-subj-1',
        marksObtained: 9,
        isCorrect: true,
        aiFeedback: 'Excellent analysis of distributed transactions.',
        rubric: [
          { name: 'Conceptual Correctness', score: 4.5, maxScore: 5, comment: 'Clear distinction' },
          { name: 'Technical Depth', score: 2.5, maxScore: 3, comment: 'Mentions version numbers' },
          { name: 'Clarity & Structure', score: 2.0, maxScore: 2, comment: 'Concise explanation' },
        ],
        strengths: ['Accurate contrast between mechanisms'],
        improvements: ['Include mention of deadlocks in pessimistic schemes'],
        newTotalScore: 90,
        percentage: 90,
        passed: true,
      },
    }

    vi.mocked(testsAService.gradeSubjectiveAnswer).mockResolvedValueOnce(mockGradeResponse as any)

    render(
      <ResultsView
        result={mockSubjectiveResult}
        onRetry={vi.fn()}
        onBack={vi.fn()}
      />
    )

    const gradeButton = screen.getByText('⚡ Grade with AI Rubric')
    fireEvent.click(gradeButton)

    await waitFor(() => {
      expect(testsAService.gradeSubjectiveAnswer).toHaveBeenCalledWith(
        'test-subj-100',
        expect.objectContaining({
          questionId: 'q-subj-1',
          testResultId: 'att-subj-1',
        })
      )
    })
  })

  it('renders multi-dimensional rubric scorecard with strengths and improvements when feedback is structured JSON', () => {
    const rubricJson = JSON.stringify({
      feedback: 'Very thorough explanation covering concurrency and database integrity.',
      rubric: [
        { name: 'Conceptual Correctness', score: 5, maxScore: 5, comment: 'Accurate distinction between locks' },
        { name: 'Technical Nuance', score: 3, maxScore: 3, comment: 'Good mention of conflict resolution' },
        { name: 'Clarity & Structure', score: 2, maxScore: 2, comment: 'Well structured response' },
      ],
      strengths: ['Clear explanation of validation phases', 'Good understanding of transaction concurrency'],
      improvements: ['Consider mentioning retry overhead under high write contention'],
    })

    const gradedResult: TestResult = {
      ...mockSubjectiveResult,
      question_results: [
        {
          ...mockSubjectiveResult.question_results[0],
          is_correct: true,
          marks_obtained: 10,
          ai_feedback: rubricJson,
        },
      ],
    }

    render(
      <ResultsView
        result={gradedResult}
        onRetry={vi.fn()}
        onBack={vi.fn()}
      />
    )

    // Rubric title and dimensions
    expect(screen.getByText('AI Rubric Evaluation')).toBeInTheDocument()
    expect(screen.getByText('Dimensional Rubric Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Conceptual Correctness')).toBeInTheDocument()
    expect(screen.getByText('Technical Nuance')).toBeInTheDocument()
    expect(screen.getByText('Clarity & Structure')).toBeInTheDocument()

    // Strengths and improvements
    expect(screen.getByText('Demonstrated Strengths')).toBeInTheDocument()
    expect(screen.getByText('Clear explanation of validation phases')).toBeInTheDocument()
    expect(screen.getByText('Actionable Recommendations')).toBeInTheDocument()
    expect(screen.getByText('Consider mentioning retry overhead under high write contention')).toBeInTheDocument()

    // Re-evaluate button is present
    expect(screen.getByText('Re-evaluate')).toBeInTheDocument()
  })
})

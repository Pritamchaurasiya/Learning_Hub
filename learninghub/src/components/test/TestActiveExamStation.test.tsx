import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TestActiveExamStation } from './TestActiveExamStation'
import type { UnifiedTestState } from '../../stores/slices/testSlice'

vi.mock('../SEO', () => ({
  SEO: () => <div data-testid="mock-seo" />,
}))

const createMockTestState = (): UnifiedTestState => ({
  mode: 'tests-a',
  isActive: true,
  isLoading: false,
  error: null,
  currentQuestionIndex: 0,
  questions: [
    {
      id: 'q-1',
      text: 'What is Newton second law?',
      question_type: 'mcq',
      difficulty: 0.5,
      bloom_level: 'understand',
      options: [
        { id: 'opt-1', text: 'F = ma', order: 1 },
        { id: 'opt-2', text: 'E = mc^2', order: 2 },
      ],
      order: 0,
      marks: 1,
    },
  ],
  answers: {},
  confidences: {},
  flaggedQuestions: [],
  timeRemaining: 1800,
  isSubmitting: false,
  assessmentMode: 'adaptive',
  adaptiveTheta: 0.0,
  adaptiveSem: 1.0,
  autosaveStatus: 'idle',
  lastAutosavedAt: null,
  testInfo: {
    testId: 'test-101',
    testTitle: 'Physics Mechanics Exam',
    totalQuestions: 1,
    timeLimit: 30,
  },
  attempt: null,
  results: null,
  sections: [
    {
      id: 'sec-1',
      title: 'Section A - Mechanics',
      order: 1,
      question_count: 1,
    },
  ],
  activeSectionId: 'sec-1',
  lockedSectionIds: [],
  sectionTimeRemaining: {},
  isOfflineMode: false,
  pendingSyncCount: 0,
  isContestMode: false,
  proctorViolations: 0,
  practiceFeedback: {},
  currentAttempt: null,
  quizInfo: null,
})

describe('TestActiveExamStation Component', () => {
  it('renders test exam header and question text', () => {
    const mockState = createMockTestState()
    render(
      <TestActiveExamStation
        test={mockState}
        isOnline={true}
        isSubmitting={false}
        isSubmitModalOpen={false}
        setIsSubmitModalOpen={vi.fn()}
        tabSwitchCount={0}
        isProctorWarningVisible={false}
        proctorLastViolation={null}
        proctorViolationCount={0}
        dismissProctorWarning={vi.fn()}
        activeSection={mockState.sections?.[0] || null}
        isCurrentSectionLocked={false}
        practiceChecked={{}}
        onCheckPracticeAnswer={vi.fn()}
        adaptiveStepLoading={false}
        socraticModalQuestion={null}
        setSocraticModalQuestion={vi.fn()}
        onNavigateToQuestion={vi.fn()}
        onSelectSection={vi.fn()}
        onLockSection={vi.fn()}
        onAnswerQuestion={vi.fn()}
        onConfidenceChange={vi.fn()}
        onFlagQuestion={vi.fn()}
        onUnflagQuestion={vi.fn()}
        onAdaptiveStep={vi.fn()}
        onSubmit={vi.fn()}
        onToast={vi.fn()}
      />
    )

    expect(screen.getByText('Physics Mechanics Exam')).toBeInTheDocument()
    expect(screen.getByText('What is Newton second law?')).toBeInTheDocument()
    expect(screen.getByText('F = ma')).toBeInTheDocument()
  })

  it('renders offline warning banner when offline', () => {
    const mockState = createMockTestState()
    render(
      <TestActiveExamStation
        test={mockState}
        isOnline={false}
        isSubmitting={false}
        isSubmitModalOpen={false}
        setIsSubmitModalOpen={vi.fn()}
        tabSwitchCount={0}
        isProctorWarningVisible={false}
        proctorLastViolation={null}
        proctorViolationCount={0}
        dismissProctorWarning={vi.fn()}
        activeSection={mockState.sections?.[0] || null}
        isCurrentSectionLocked={false}
        practiceChecked={{}}
        onCheckPracticeAnswer={vi.fn()}
        adaptiveStepLoading={false}
        socraticModalQuestion={null}
        setSocraticModalQuestion={vi.fn()}
        onNavigateToQuestion={vi.fn()}
        onSelectSection={vi.fn()}
        onLockSection={vi.fn()}
        onAnswerQuestion={vi.fn()}
        onConfidenceChange={vi.fn()}
        onFlagQuestion={vi.fn()}
        onUnflagQuestion={vi.fn()}
        onAdaptiveStep={vi.fn()}
        onSubmit={vi.fn()}
        onToast={vi.fn()}
      />
    )

    expect(screen.getByText(/Working Offline:/i)).toBeInTheDocument()
  })

  it('renders remote proctor intervention banner when alert received', () => {
    const mockState = createMockTestState()
    const dismissRemoteProctorWarning = vi.fn()

    render(
      <TestActiveExamStation
        test={mockState}
        isOnline={true}
        isSubmitting={false}
        isSubmitModalOpen={false}
        setIsSubmitModalOpen={vi.fn()}
        tabSwitchCount={0}
        isProctorWarningVisible={false}
        proctorLastViolation={null}
        proctorViolationCount={0}
        dismissProctorWarning={vi.fn()}
        remoteProctorWarning="Maintain video feed centered at all times."
        dismissRemoteProctorWarning={dismissRemoteProctorWarning}
        isWsConnected={true}
        activeSection={mockState.sections?.[0] || null}
        isCurrentSectionLocked={false}
        practiceChecked={{}}
        onCheckPracticeAnswer={vi.fn()}
        adaptiveStepLoading={false}
        socraticModalQuestion={null}
        setSocraticModalQuestion={vi.fn()}
        onNavigateToQuestion={vi.fn()}
        onSelectSection={vi.fn()}
        onLockSection={vi.fn()}
        onAnswerQuestion={vi.fn()}
        onConfidenceChange={vi.fn()}
        onFlagQuestion={vi.fn()}
        onUnflagQuestion={vi.fn()}
        onAdaptiveStep={vi.fn()}
        onSubmit={vi.fn()}
        onToast={vi.fn()}
      />
    )

    expect(screen.getByText(/Live Proctor Intervention/i)).toBeInTheDocument()
    expect(screen.getByText('Maintain video feed centered at all times.')).toBeInTheDocument()
  })
})


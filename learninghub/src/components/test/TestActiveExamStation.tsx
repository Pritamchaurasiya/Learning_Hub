import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { SEO } from '../SEO'
import { TestExamHeader } from './TestExamHeader'
import { TestSectionTabBar } from './TestSectionTabBar'
import { TestQuestionPalette } from './TestQuestionPalette'
import { QuestionCard } from './QuestionCard'
import { TestNavigationControls } from './TestNavigationControls'
import { ProctoringWarningBanner } from './ProctoringWarningBanner'
import { SocraticReviewModal } from './SocraticReviewModal'
import { TestSubmitModal } from './TestSubmitModal'
import type { UnifiedTestState } from '../../stores/slices/testSlice'
import type { ProctoringViolation } from '../../hooks/useProctoring'
import type { TestSection } from '../../services/testsAService'

export interface TestActiveExamStationProps {
  test: UnifiedTestState
  isOnline: boolean
  isSubmitting: boolean
  isSubmitModalOpen: boolean
  setIsSubmitModalOpen: (open: boolean) => void
  tabSwitchCount: number
  isProctorWarningVisible: boolean
  proctorLastViolation: ProctoringViolation | null
  proctorViolationCount: number
  dismissProctorWarning: () => void
  activeSection: TestSection | null
  isCurrentSectionLocked: boolean
  practiceChecked: Record<string, boolean>
  onCheckPracticeAnswer: (questionId: string) => void
  adaptiveStepLoading: boolean
  socraticModalQuestion: {
    questionText: string
    selectedOptionText: string
    correctOptionText: string
  } | null
  setSocraticModalQuestion: (
    val: {
      questionText: string
      selectedOptionText: string
      correctOptionText: string
    } | null
  ) => void
  onNavigateToQuestion: (index: number) => void
  onSelectSection: (sectionId: string, firstIndex?: number) => void
  onLockSection: (sectionId: string) => void
  onAnswerQuestion: (questionId: string, optionId: string | string[]) => void
  onConfidenceChange: (questionId: string, level: string) => void
  onFlagQuestion: (questionId: string) => void
  onUnflagQuestion: (questionId: string) => void
  onAdaptiveStep: () => void
  onSubmit: () => void
  onToast: (toast: { message: string; type: 'info' | 'warning' | 'error' | 'success' }) => void
}

export const TestActiveExamStation = memo(function TestActiveExamStation({
  test,
  isOnline,
  isSubmitting,
  isSubmitModalOpen,
  setIsSubmitModalOpen,
  tabSwitchCount,
  isProctorWarningVisible,
  proctorLastViolation,
  proctorViolationCount,
  dismissProctorWarning,
  activeSection,
  isCurrentSectionLocked,
  practiceChecked,
  onCheckPracticeAnswer,
  adaptiveStepLoading,
  socraticModalQuestion,
  setSocraticModalQuestion,
  onNavigateToQuestion,
  onSelectSection,
  onLockSection,
  onAnswerQuestion,
  onConfidenceChange,
  onFlagQuestion,
  onUnflagQuestion,
  onAdaptiveStep,
  onSubmit,
  onToast,
}: TestActiveExamStationProps) {
  const currentQuestion = test.questions[test.currentQuestionIndex]
  const selectedAnswer = currentQuestion ? test.answers[currentQuestion.id] ?? null : null
  const isFlagged = currentQuestion ? test.flaggedQuestions.includes(currentQuestion.id) : false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SEO title={`Tests A+ - ${test.testInfo?.testTitle ?? 'Test'}`} />

      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4" />
          <span>
            Working Offline: Your answers are safely buffered locally. Reconnect before submitting.
          </span>
        </div>
      )}

      <ProctoringWarningBanner
        isWarningVisible={isProctorWarningVisible}
        lastViolation={proctorLastViolation}
        onDismiss={dismissProctorWarning}
        violationCount={proctorViolationCount}
      />

      <TestExamHeader
        title={test.testInfo?.testTitle}
        assessmentMode={test.assessmentMode}
        adaptiveTheta={test.adaptiveTheta}
        adaptiveSem={test.adaptiveSem}
        timeRemaining={test.timeRemaining}
        tabSwitchCount={tabSwitchCount}
        autosaveStatus={test.autosaveStatus}
        lastAutosavedAt={test.lastAutosavedAt}
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        currentQuestionIndex={test.currentQuestionIndex}
        totalQuestions={test.questions.length}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <TestSectionTabBar
          sections={test.sections || []}
          questions={test.questions}
          answers={test.answers}
          activeSectionId={activeSection?.id || test.activeSectionId || undefined}
          lockedSectionIds={test.lockedSectionIds}
          isCurrentSectionLocked={isCurrentSectionLocked}
          onSelectSection={(sectionId, firstIndex) => {
            onSelectSection(sectionId, firstIndex)
          }}
          onLockSection={sectionId => {
            onLockSection(sectionId)
            onToast({
              message: `🔒 Section "${activeSection?.title || 'Section'}" locked. Advanced to next section.`,
              type: 'info',
            })
          }}
          onWarning={message => {
            onToast({
              message,
              type: 'warning',
            })
          }}
        />

        <TestQuestionPalette
          questions={test.questions}
          currentIndex={test.currentQuestionIndex}
          answers={test.answers}
          flaggedQuestions={test.flaggedQuestions}
          onSelectQuestion={onNavigateToQuestion}
        />

        {currentQuestion && (
          <AnimatePresence mode="wait">
            <motion.div
              key={test.currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionCard
                question={currentQuestion}
                currentIndex={test.currentQuestionIndex}
                totalQuestions={test.questions.length}
                selectedAnswer={selectedAnswer}
                confidence={test.confidences[currentQuestion.id]}
                isFlagged={isFlagged}
                sectionTitle={activeSection?.title}
                isSectionLocked={isCurrentSectionLocked}
                onAnswer={optionId => onAnswerQuestion(currentQuestion.id, optionId)}
                onConfidenceChange={level => onConfidenceChange(currentQuestion.id, level)}
                onFlag={() => onFlagQuestion(currentQuestion.id)}
                onUnflag={() => onUnflagQuestion(currentQuestion.id)}
                assessmentMode={test.assessmentMode}
                practiceChecked={Boolean(practiceChecked[currentQuestion.id])}
                onCheckPracticeAnswer={() => onCheckPracticeAnswer(currentQuestion.id)}
                onDiagnoseMisconception={() => {
                  const selVal = Array.isArray(selectedAnswer)
                    ? selectedAnswer[0]
                    : selectedAnswer
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const selOpt = currentQuestion.options?.find((o: any) => o.id === selVal)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const corrOpt = currentQuestion.options?.find((o: any) => o.id !== selVal)
                  setSocraticModalQuestion({
                    questionText: currentQuestion.text,
                    selectedOptionText: selOpt?.text || 'Your selected choice',
                    correctOptionText: corrOpt?.text || 'Conceptual ground truth',
                  })
                }}
              />
            </motion.div>
          </AnimatePresence>
        )}

        <TestNavigationControls
          assessmentMode={test.assessmentMode}
          currentIndex={test.currentQuestionIndex}
          totalQuestions={test.questions.length}
          hasSelectedAnswer={Boolean(selectedAnswer)}
          adaptiveStepLoading={adaptiveStepLoading}
          onPreviousQuestion={() => onNavigateToQuestion(test.currentQuestionIndex - 1)}
          onNextQuestion={() => onNavigateToQuestion(test.currentQuestionIndex + 1)}
          onAdaptiveStep={onAdaptiveStep}
        />
      </div>

      {socraticModalQuestion && (
        <SocraticReviewModal
          isOpen={Boolean(socraticModalQuestion)}
          onClose={() => setSocraticModalQuestion(null)}
          questionText={socraticModalQuestion.questionText}
          selectedOptionText={socraticModalQuestion.selectedOptionText}
          correctOptionText={socraticModalQuestion.correctOptionText}
        />
      )}

      <TestSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        attemptedCount={
          Object.values(test.answers).filter(v => v !== undefined && v !== '').length
        }
        unansweredCount={Math.max(
          0,
          test.questions.length -
            Object.values(test.answers).filter(v => v !== undefined && v !== '').length
        )}
        flaggedCount={test.flaggedQuestions.length}
        timeRemaining={test.timeRemaining}
      />
    </div>
  )
})

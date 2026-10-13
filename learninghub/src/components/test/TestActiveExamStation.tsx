import { memo, useState } from 'react'
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
  remoteProctorWarning?: string | null
  dismissRemoteProctorWarning?: () => void
  isWsConnected?: boolean
  webcamStream?: MediaStream | null
  isWebcamActive?: boolean
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
  remoteProctorWarning,
  dismissRemoteProctorWarning,
  isWsConnected = false,
  webcamStream,
  isWebcamActive,
}: TestActiveExamStationProps) {
  const [isWebcamMinimized, setIsWebcamMinimized] = useState(false)
  const currentQuestion = test.questions[test.currentQuestionIndex]
  const selectedAnswer = currentQuestion ? test.answers[currentQuestion.id] ?? null : null
  const isFlagged = currentQuestion ? test.flaggedQuestions.includes(currentQuestion.id) : false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <SEO title={`Tests A+ - ${test.testInfo?.testTitle ?? 'Test'}`} />

      {isWsConnected && (
        <span className="sr-only" data-testid="live-ws-indicator">WebSocket Connected</span>
      )}

      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4" />
          <span>
            Working Offline: Your answers are safely buffered locally. Reconnect before submitting.
          </span>
        </div>
      )}

      {remoteProctorWarning && (
        <div
          className="bg-rose-600 text-white font-medium px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="font-bold uppercase tracking-wider text-xs block opacity-90">
                Live Proctor Intervention
              </span>
              <span className="text-sm">{remoteProctorWarning}</span>
            </div>
          </div>
          {dismissRemoteProctorWarning && (
            <button
              onClick={dismissRemoteProctorWarning}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-md font-semibold transition"
            >
              Acknowledge
            </button>
          )}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Workspace (8 cols on lg+) */}
          <div className="lg:col-span-8 space-y-6">
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

            {/* Mobile/Tablet Inline Palette (hidden on lg+ desktop) */}
            <div className="block lg:hidden">
              <TestQuestionPalette
                questions={test.questions}
                currentIndex={test.currentQuestionIndex}
                answers={test.answers}
                flaggedQuestions={test.flaggedQuestions}
                onSelectQuestion={onNavigateToQuestion}
              />
            </div>

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
                      const corrOpt = currentQuestion.options?.find((o: any) => o.is_correct || o.isCorrect) ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        currentQuestion.options?.find((o: any) => o.id !== selVal)
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

          {/* Sticky Palette Sidebar on Widescreen (4 cols on lg+) */}
          <aside
            aria-label="Question Navigation & Exam Palette"
            className="hidden lg:block lg:col-span-4 sticky top-20 space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Question Palette ({test.questions.length})
                </h3>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  Q {test.currentQuestionIndex + 1} / {test.questions.length}
                </span>
              </div>
              <TestQuestionPalette
                questions={test.questions}
                currentIndex={test.currentQuestionIndex}
                answers={test.answers}
                flaggedQuestions={test.flaggedQuestions}
                onSelectQuestion={onNavigateToQuestion}
              />
            </div>
          </aside>
        </div>
      </main>

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

      {webcamStream && (
        <aside
          aria-label="Live Proctoring Camera Feed"
          className={`fixed z-40 transition-all duration-300 shadow-2xl backdrop-blur-md bg-slate-900/95 border border-slate-700/80 rounded-2xl flex flex-col items-center ${
            isWebcamMinimized
              ? 'bottom-20 right-4 p-2'
              : 'bottom-20 sm:bottom-4 right-4 p-2 max-w-[140px] sm:max-w-[160px]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1 px-1">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold tracking-tight">
              <span
                className={`w-2 h-2 rounded-full ${
                  isWebcamActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Proctor</span>
            </div>
            <button
              type="button"
              onClick={() => setIsWebcamMinimized(prev => !prev)}
              aria-label={isWebcamMinimized ? 'Expand proctor camera feed' : 'Minimize proctor camera feed'}
              className="text-slate-400 hover:text-white p-0.5 rounded text-[10px] transition ml-2"
            >
              {isWebcamMinimized ? '▲ Expand' : '▼ Minimize'}
            </button>
          </div>

          {!isWebcamMinimized && (
            <>
              <video
                ref={videoRef => {
                  if (videoRef && videoRef.srcObject !== webcamStream) {
                    videoRef.srcObject = webcamStream
                    videoRef.play().catch(() => {})
                  }
                }}
                autoPlay
                playsInline
                muted
                aria-label="Candidate webcam stream"
                className="w-28 h-20 sm:w-32 sm:h-24 object-cover rounded-xl bg-black border border-slate-800"
              />
              <span className="mt-1 text-[9px] font-mono text-slate-400">
                {isWebcamActive ? 'AI Guard Active' : 'Standby'}
              </span>
            </>
          )}
        </aside>
      )}
    </div>
  )
})

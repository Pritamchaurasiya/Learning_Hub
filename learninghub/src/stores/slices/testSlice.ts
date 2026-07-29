import { StateCreator } from 'zustand'
import { trackEvent } from '../../services/analyticsGA4Service'
import { testsAService } from '../../services/testsAService'
import type { TestQuestion, TestResult } from '../../services/testsAService'
import type { AppState, TestMode } from '../types'
export type { TestMode }

export interface TestInfo {
  testId: string
  testTitle: string
  totalQuestions: number
  timeLimit: number
}

export interface TestAttemptState {
  attemptId: string
  testId: string
  testTitle: string
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired'
  startedAt: string
  totalQuestions: number
  answeredQuestions: number
}

export interface UnifiedTestState {
  // Core test state (works for both modes)
  mode: TestMode
  isActive: boolean
  isLoading: boolean
  error: string | null

  // Questions & Answers
  currentQuestionIndex: number
  questions: TestQuestion[]
  answers: Record<string, string | string[]>
  confidences: Record<string, string>
  flaggedQuestions: string[]

  // Timer
  timeRemaining: number

  // Test metadata
  testInfo: TestInfo | null
  attempt: TestAttemptState | null

  // Results
  results: TestResult | null
  isSubmitting: boolean

  // Autosave
  lastAutosavedAt: string | null

  // Legacy quiz compatibility (deprecated, will be removed)
  currentAttempt: TestAttemptState | null
  quizInfo: TestInfo | null
}

const initialState: UnifiedTestState = {
  mode: 'tests-a',
  isActive: false,
  isLoading: false,
  error: null,
  currentQuestionIndex: 0,
  questions: [],
  answers: {},
  confidences: {},
  flaggedQuestions: [],
  timeRemaining: 0,
  testInfo: null,
  attempt: null,
  results: null,
  isSubmitting: false,
  lastAutosavedAt: null,
  // Legacy compatibility
  currentAttempt: null,
  quizInfo: null,
}

export interface TestSlice {
  test: UnifiedTestState

  // Core actions
  startTest: (
    mode: TestMode,
    testId: string,
    testTitle: string,
    totalQuestions: number,
    timeLimit: number
  ) => void
  answerQuestion: (questionId: string, answerValue: string | string[]) => void
  setConfidence: (questionId: string, confidence: string) => void
  flagQuestion: (questionId: string) => void
  unflagQuestion: (questionId: string) => void
  navigateToQuestion: (index: number) => void
  updateTestTimer: (timeRemaining: number) => void
  setTestQuestions: (
    questions: TestQuestion[],
    testInfo: TestInfo,
    attemptId: string,
    initialAnswers?: Record<string, string>,
    timeRemaining?: number
  ) => void
  submitTest: () => Promise<{ success: boolean; score: number }>
  resetTestState: () => void
  abandonTest: () => void
  setTestResults: (results: TestResult) => void
  setLastAutosavedAt: (timestamp: number | string) => void
  updateSubjectiveGrade: (payload: {
    questionId: string
    marksObtained: number
    isCorrect: boolean
    aiFeedback?: string
    percentage: number
    passed: boolean
  }) => void

  // Legacy compatibility methods (deprecated)
  quizStartAttempt: (
    quizId: string,
    quizTitle: string,
    totalQuestions: number,
    timeLimit: number
  ) => void
  quizAnswerQuestion: (questionId: string, answerValue: string) => void
  quizFlagQuestion: (questionId: string) => void
  quizUnflagQuestion: (questionId: string) => void
  quizNavigateToQuestion: (index: number) => void
  updateQuizTimer: (timeRemaining: number) => void
  setQuizQuestions: (questions: any[], quizInfo: any) => void
  submitQuiz: () => Promise<{ success: boolean; score: number }>
  resetQuizState: () => void
  clearQuiz: () => void
  abandonQuiz: () => void
}

export const createTestSlice: StateCreator<AppState & TestSlice, [], [], TestSlice> = (
  set,
  get
) => ({
  test: initialState,
  get testsA() {
    const t = get()?.test ?? initialState
    return { ...t, attemptId: t.attempt?.attemptId ?? null }
  },

  startTestAttempt: (
    testId: string,
    testTitle: string,
    totalQuestions: number,
    timeLimit: number
  ) => {
    get().startTest('tests-a', testId, testTitle, totalQuestions, timeLimit)
  },

  // ─── Core Actions ──────────────────────────────────────────────────────────

  startTest: (mode, testId, testTitle, totalQuestions, timeLimit) => {
    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const attemptState: TestAttemptState = {
      attemptId,
      testId,
      testTitle,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      totalQuestions,
      answeredQuestions: 0,
    }

    set(() => ({
      test: {
        ...initialState,
        mode,
        isActive: true,
        timeRemaining: timeLimit * 60,
        testInfo: { testId, testTitle, totalQuestions, timeLimit },
        attempt: attemptState,
        isLoading: true,
        flaggedQuestions: [],
        currentAttempt: attemptState, // Legacy compat
        quizInfo: { testId, testTitle, totalQuestions, timeLimit }, // Legacy compat
      },
    }))
    trackEvent('test_started', { test_id: testId, total_questions: totalQuestions, mode })
  },

  answerQuestion: (questionId: string, answerValue: string | string[]) => {
    set(state => {
      const newAnswers = { ...state.test.answers, [questionId]: answerValue }
      // Backup answers to localStorage for crash recovery
      try {
        const backupKey = `lh_test_answers_${state.test.attempt?.attemptId}`
        localStorage.setItem(backupKey, JSON.stringify(newAnswers))
      } catch {
        // Storage full or unavailable — non-critical
      }
      return {
        test: {
          ...state.test,
          answers: newAnswers,
          attempt: state.test.attempt
            ? { ...state.test.attempt, answeredQuestions: Object.keys(newAnswers).length }
            : null,
          lastAutosavedAt: new Date().toISOString(),
          currentAttempt: state.test.currentAttempt
            ? { ...state.test.currentAttempt, answeredQuestions: Object.keys(newAnswers).length }
            : null,
        },
      }
    })
  },

  setConfidence: (questionId: string, confidence: string) => {
    set(state => ({
      test: {
        ...state.test,
        confidences: { ...state.test.confidences, [questionId]: confidence },
      },
    }))
  },

  flagQuestion: (questionId: string) => {
    set(state => ({
      test: {
        ...state.test,
        flaggedQuestions: state.test.flaggedQuestions.includes(questionId)
          ? state.test.flaggedQuestions
          : [...state.test.flaggedQuestions, questionId],
      },
    }))
  },

  unflagQuestion: (questionId: string) => {
    set(state => ({
      test: {
        ...state.test,
        flaggedQuestions: state.test.flaggedQuestions.filter(id => id !== questionId),
      },
    }))
  },

  navigateToQuestion: (index: number) => {
    set(state => ({
      test: {
        ...state.test,
        currentQuestionIndex: Math.max(0, Math.min(index, state.test.questions.length - 1)),
      },
    }))
  },

  updateTestTimer: (timeRemaining: number) => {
    set(state => ({
      test: { ...state.test, timeRemaining: Math.max(0, timeRemaining) },
    }))
  },

  setTestQuestions: (questions, testInfo, attemptId, initialAnswers = {}, timeRemaining) => {
    // Merge any localStorage-backed answers with server-provided answers
    let mergedAnswers = { ...initialAnswers }
    try {
      const backupKey = `lh_test_answers_${attemptId}`
      const backup = localStorage.getItem(backupKey)
      if (backup) {
        const parsed = JSON.parse(backup) as Record<string, string>
        // Backup wins for keys not already in server answers (server is fresher)
        mergedAnswers = { ...parsed, ...initialAnswers }
      }
    } catch {
      // Ignore parse errors
    }

    set(state => ({
      test: {
        ...state.test,
        questions,
        answers: mergedAnswers,
        confidences: {},
        testInfo,
        attempt: state.test.attempt
          ? { ...state.test.attempt, attemptId }
          : {
              attemptId,
              testId: testInfo.testId,
              testTitle: testInfo.testTitle,
              status: 'in_progress',
              startedAt: new Date().toISOString(),
              totalQuestions: testInfo.totalQuestions,
              answeredQuestions: 0,
            },
        timeRemaining: timeRemaining ?? state.test.timeRemaining,
        isLoading: false,
        error: null,
        currentAttempt: state.test.currentAttempt
          ? { ...state.test.currentAttempt, attemptId }
          : null,
      },
    }))
  },

  submitTest: async () => {
    const { test } = get()
    const { testInfo, answers, confidences, attempt, timeRemaining } = test

    if (!testInfo || !attempt) {
      return { success: false, score: 0 }
    }

    if (test.isSubmitting) {
      return { success: false, score: 0 }
    }

    set(state => ({ test: { ...state.test, isSubmitting: true } }))

    try {
      const timeTaken = testInfo.timeLimit * 60 - timeRemaining

      const response = await testsAService.submitTest(
        testInfo.testId,
        answers,
        timeTaken,
        attempt.attemptId,
        confidences
      )

      const resultData = response.data
      if (response.status === 'success' || resultData.score !== undefined) {
        // Clean up localStorage backup on successful submission
        try {
          localStorage.removeItem(`lh_test_answers_${attempt.attemptId}`)
        } catch {
          // non-critical
        }

        set(state => ({
          test: {
            ...state.test,
            isActive: false,
            results: resultData,
            isLoading: false,
            isSubmitting: false,
            attempt: state.test.attempt ? { ...state.test.attempt, status: 'completed' } : null,
            currentAttempt: state.test.currentAttempt
              ? { ...state.test.currentAttempt, status: 'completed' }
              : null,
          },
        }))

        // Re-hydrate user XP and global state optimistically to stay in sync with Gamification backend
        void get().fetchMe()

        trackEvent('test_completed', {
          test_id: testInfo.testId,
          score: resultData.score,
          correct_answers: resultData.correct_count,
          total_questions: test.questions.length,
          mode: test.mode,
        })

        return { success: true, score: Number(resultData.score ?? 0) }
      }

      set(state => ({
        test: {
          ...state.test,
          isLoading: false,
          isSubmitting: false,
          error: 'Submission failed',
        },
      }))
      return { success: false, score: 0 }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to submit test'
      set(state => ({
        test: {
          ...state.test,
          isLoading: false,
          isSubmitting: false,
          error: errMsg,
        },
      }))
      return { success: false, score: 0 }
    }
  },

  resetTestState: () => {
    // Clean up any localStorage backup
    const state = get()
    if (state.test.attempt?.attemptId) {
      try {
        localStorage.removeItem(`lh_test_answers_${state.test.attempt.attemptId}`)
      } catch {
        // non-critical
      }
    }
    set({ test: initialState })
  },

  abandonTest: () => {
    const state = get()
    if (state.test.attempt?.attemptId) {
      try {
        localStorage.removeItem(`lh_test_answers_${state.test.attempt.attemptId}`)
      } catch {
        // non-critical
      }
    }
    trackEvent('test_abandoned', {
      test_id: state.test.testInfo?.testId,
      answered_questions: Object.keys(state.test.answers).length,
      mode: state.test.mode,
    })
    set({
      test: {
        ...initialState,
        isActive: false,
      },
    })
  },

  setTestResults: (results: TestResult) => {
    set(state => ({
      test: {
        ...state.test,
        results,
        isActive: false,
        isLoading: false,
        isSubmitting: false,
      },
    }))
  },

  setLastAutosavedAt: (timestamp: number | string) => {
    set(state => ({
      test: {
        ...state.test,
        lastAutosavedAt: String(timestamp),
      },
    }))
  },

  updateSubjectiveGrade: payload => {
    set(state => {
      if (!state.test.results?.question_results) {
        return state
      }

      const newQuestionResults = state.test.results.question_results.map(qr => {
        if (qr.question_id === payload.questionId) {
          return {
            ...qr,
            marks_obtained: payload.marksObtained,
            is_correct: payload.isCorrect,
            explanation: payload.aiFeedback || qr.explanation,
          }
        }
        return qr
      })

      return {
        test: {
          ...state.test,
          results: {
            ...state.test.results,
            score: payload.percentage, // Score in UI is percentage
            passed: payload.passed,
            question_results: newQuestionResults,
          },
        },
      }
    })
  },

  // ─── Legacy Compatibility Methods (Deprecated) ────────────────────────────

  quizStartAttempt: (quizId, quizTitle, totalQuestions, timeLimit) => {
    console.warn('[DEPRECATED] quizStartAttempt is deprecated, use startTest instead')
    get().startTest('legacy', quizId, quizTitle, totalQuestions, timeLimit)
  },

  quizAnswerQuestion: (questionId: string, answerValue: string) => {
    console.warn('[DEPRECATED] quizAnswerQuestion is deprecated, use answerQuestion instead')
    get().answerQuestion(questionId, answerValue)
  },

  quizFlagQuestion: (questionId: string) => {
    console.warn('[DEPRECATED] quizFlagQuestion is deprecated, use flagQuestion instead')
    get().flagQuestion(questionId)
  },

  quizUnflagQuestion: (questionId: string) => {
    console.warn('[DEPRECATED] quizUnflagQuestion is deprecated, use unflagQuestion instead')
    get().unflagQuestion(questionId)
  },

  quizNavigateToQuestion: (index: number) => {
    console.warn(
      '[DEPRECATED] quizNavigateToQuestion is deprecated, use navigateToQuestion instead'
    )
    get().navigateToQuestion(index)
  },

  updateQuizTimer: (timeRemaining: number) => {
    console.warn('[DEPRECATED] updateQuizTimer is deprecated, use updateTestTimer instead')
    get().updateTestTimer(timeRemaining)
  },

  setQuizQuestions: (questions: any[], quizInfo: any) => {
    console.warn('[DEPRECATED] setQuizQuestions is deprecated, use setTestQuestions instead')
    // Create a mock attempt for legacy compatibility
    const attemptId = `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    get().setTestQuestions(questions, quizInfo, attemptId, {}, (quizInfo?.timeLimit ?? 30) * 60)
  },

  submitQuiz: async () => {
    console.warn('[DEPRECATED] submitQuiz is deprecated, use submitTest instead')
    const result = await get().submitTest()
    return { success: result.success, score: result.score }
  },

  resetQuizState: () => {
    console.warn('[DEPRECATED] resetQuizState is deprecated, use resetTestState instead')
    get().resetTestState()
  },

  clearQuiz: () => {
    console.warn('[DEPRECATED] clearQuiz is deprecated, use resetTestState instead')
    get().resetTestState()
  },

  abandonQuiz: () => {
    console.warn('[DEPRECATED] abandonQuiz is deprecated, use abandonTest instead')
    get().abandonTest()
  },
})

export default createTestSlice

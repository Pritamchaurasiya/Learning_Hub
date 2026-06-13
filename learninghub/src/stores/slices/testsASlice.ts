import { StateCreator } from 'zustand'
import { testsAService } from '../../services/testsAService'
import type { TestResult } from '../../services/testsAService'
import type { AppState, TestsAState, TestsASlice } from '../types'

const initialTestsAState: TestsAState = {
  isActive: false,
  currentQuestionIndex: 0,
  questions: [],
  answers: {},
  confidences: {},
  flaggedQuestions: [],
  timeRemaining: 0,
  testInfo: null,
  attemptId: null,
  isLoading: false,
  error: null,
  results: null,
  isSubmitting: false,
  lastAutosavedAt: null,
}

export const createTestsASlice: StateCreator<AppState, [], [], TestsASlice> = (set, get) => ({
  testsA: initialTestsAState,

  startTestAttempt: (testId, testTitle, totalQuestions, timeLimit) => {
    set(() => ({
      testsA: {
        ...initialTestsAState,
        isActive: true,
        timeRemaining: timeLimit * 60,
        testInfo: { testId, testTitle, totalQuestions, timeLimit },
        isLoading: true,
        flaggedQuestions: [],
      },
    }))
  },

  answerQuestion: (questionId, optionId) => {
    set(state => {
      const updatedAnswers = { ...state.testsA.answers, [questionId]: optionId }
      // Backup answers to localStorage for crash recovery
      try {
        const backupKey = `lh_test_answers_${state.testsA.attemptId}`
        localStorage.setItem(backupKey, JSON.stringify(updatedAnswers))
      } catch {
        // Storage full or unavailable — non-critical
      }
      return {
        testsA: {
          ...state.testsA,
          answers: updatedAnswers,
        },
      }
    })
  },

  setConfidence: (questionId, confidence) => {
    set(state => ({
      testsA: {
        ...state.testsA,
        confidences: { ...state.testsA.confidences, [questionId]: confidence },
      },
    }))
  },

  flagQuestion: questionId => {
    set(state => ({
      testsA: {
        ...state.testsA,
        flaggedQuestions: state.testsA.flaggedQuestions.includes(questionId)
          ? state.testsA.flaggedQuestions
          : [...state.testsA.flaggedQuestions, questionId],
      },
    }))
  },

  unflagQuestion: questionId => {
    set(state => ({
      testsA: {
        ...state.testsA,
        flaggedQuestions: state.testsA.flaggedQuestions.filter(id => id !== questionId),
      },
    }))
  },

  navigateToQuestion: index => {
    set(state => {
      const maxIndex = Math.max(0, state.testsA.questions.length - 1)
      const clampedIndex = Math.max(0, Math.min(index, maxIndex))
      return {
        testsA: {
          ...state.testsA,
          currentQuestionIndex: clampedIndex,
        },
      }
    })
  },

  updateTestTimer: timeRemaining => {
    set(state => ({
      testsA: {
        ...state.testsA,
        timeRemaining,
      },
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
      testsA: {
        ...state.testsA,
        questions,
        answers: mergedAnswers,
        confidences: {},
        testInfo,
        attemptId,
        timeRemaining: timeRemaining ?? state.testsA.timeRemaining,
        isLoading: false,
        error: null,
      },
    }))
  },

  submitTest: async (): Promise<{ success: boolean; score: number }> => {
    const { testsA } = get()
    const { testInfo, answers, confidences, attemptId, timeRemaining } = testsA

    if (!testInfo || !attemptId) {
      return { success: false, score: 0 }
    }

    if (testsA.isSubmitting) {
      return { success: false, score: 0 }
    }

    set(state => ({ testsA: { ...state.testsA, isSubmitting: true } }))

    try {
      const timeTaken = testInfo.timeLimit * 60 - timeRemaining

      const response = await testsAService.submitTest(
        testInfo.testId,
        answers,
        timeTaken,
        attemptId,
        confidences
      )

      const resultData = response.data
      if (response.status === 'success' || resultData.score !== undefined) {
        // Clean up localStorage backup on successful submission
        try {
          localStorage.removeItem(`lh_test_answers_${attemptId}`)
        } catch {
          // non-critical
        }
        set(state => ({
          testsA: {
            ...state.testsA,
            isActive: false,
            results: resultData,
            isLoading: false,
            isSubmitting: false,
          },
        }))
        return { success: true, score: Number(resultData.score ?? 0) }
      }

      set(state => ({
        testsA: {
          ...state.testsA,
          isLoading: false,
          isSubmitting: false,
          error: 'Submission failed',
        },
      }))
      return { success: false, score: 0 }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to submit test'
      set(state => ({
        testsA: {
          ...state.testsA,
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
    if (state.testsA.attemptId) {
      try {
        localStorage.removeItem(`lh_test_answers_${state.testsA.attemptId}`)
      } catch {
        // non-critical
      }
    }
    set({ testsA: initialTestsAState })
  },

  abandonTest: () => {
    const state = get()
    if (state.testsA.attemptId) {
      try {
        localStorage.removeItem(`lh_test_answers_${state.testsA.attemptId}`)
      } catch {
        // non-critical
      }
    }
    set({
      testsA: {
        ...initialTestsAState,
        isActive: false,
      },
    })
  },

  setTestResults: (results: TestResult) => {
    set(state => ({
      testsA: {
        ...state.testsA,
        results,
        isActive: false,
        isLoading: false,
        isSubmitting: false,
      },
    }))
  },
  setLastAutosavedAt: timestamp => {
    set(state => ({
      testsA: {
        ...state.testsA,
        lastAutosavedAt: timestamp,
      },
    }))
  },
})

export default createTestsASlice

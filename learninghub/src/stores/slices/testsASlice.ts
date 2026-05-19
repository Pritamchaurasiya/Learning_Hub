import { StateCreator } from 'zustand'
import { testsAService, TestQuestion, TestResult } from '../../services/testsAService'

export interface TestInfo {
  testId: string
  testTitle: string
  totalQuestions: number
  timeLimit: number
}

export interface TestsAState {
  isActive: boolean
  currentQuestionIndex: number
  questions: TestQuestion[]
  answers: Record<string, string>
  flaggedQuestions: string[]
  timeRemaining: number
  testInfo: TestInfo | null
  attemptId: string | null
  isLoading: boolean
  error: string | null
  results: TestResult | null
  isSubmitting: boolean
}

export interface TestsASlice {
  testsA: TestsAState
  startTestAttempt: (
    testId: string,
    testTitle: string,
    totalQuestions: number,
    timeLimit: number
  ) => void
  answerQuestion: (questionId: string, optionId: string) => void
  flagQuestion: (questionId: string) => void
  unflagQuestion: (questionId: string) => void
  navigateToQuestion: (index: number) => void
  updateTestTimer: (timeRemaining: number) => void
  setTestQuestions: (questions: TestQuestion[], testInfo: TestInfo, attemptId: string) => void
  submitTest: () => Promise<{ success: boolean; score: number }>
  resetTestState: () => void
  abandonTest: () => void
  setTestResults: (results: TestResult) => void
}

const initialTestsAState: TestsAState = {
  isActive: false,
  currentQuestionIndex: 0,
  questions: [],
  answers: {},
  flaggedQuestions: [],
  timeRemaining: 0,
  testInfo: null,
  attemptId: null,
  isLoading: false,
  error: null,
  results: null,
  isSubmitting: false,
}

export const createTestsASlice: StateCreator<TestsASlice> = (set, get) => ({
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
    set(state => ({
      testsA: {
        ...state.testsA,
        answers: { ...state.testsA.answers, [questionId]: optionId },
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

  setTestQuestions: (questions, testInfo, attemptId) => {
    set(state => ({
      testsA: {
        ...state.testsA,
        questions,
        testInfo,
        attemptId,
        isLoading: false,
        error: null,
      },
    }))
  },

  submitTest: async () => {
    const { testsA } = get()
    const { testInfo, answers, attemptId, timeRemaining } = testsA

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
        attemptId
      )

      const resultData = response.data ?? response

      if (response.status === 'success' || resultData.score !== undefined) {
        set(state => ({
          testsA: {
            ...state.testsA,
            isActive: false,
            results: resultData,
            isLoading: false,
            isSubmitting: false,
          },
        }))
        return { success: true, score: resultData.score ?? 0 }
      }

      set(state => ({
        testsA: {
          ...state.testsA,
          isLoading: false,
          isSubmitting: false,
          error: (resultData as any).message || 'Submission failed',
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
    set({ testsA: initialTestsAState })
  },

  abandonTest: () => {
    set({
      testsA: {
        ...initialTestsAState,
        isActive: false,
      },
    })
  },

  setTestResults: results => {
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
})

export default createTestsASlice

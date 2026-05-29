import { StateCreator } from 'zustand'
import { trackEvent } from '../../services/analyticsGA4Service'
import { AppState, QuizSlice } from '../types'

const defaultQuizState = {
  currentAttempt: null,
  answers: {},
  flaggedQuestions: [],
  timeRemaining: 0,
  questions: [],
  quizInfo: null,
  currentQuestionIndex: 0,
  isSubmitting: false,
  lastSavedAt: null,
}

export const createQuizSlice: StateCreator<AppState, [], [], QuizSlice> = (set, get) => ({
  quiz: defaultQuizState,
  startQuizAttempt: (quizId, quizTitle, totalQuestions, timeLimit) => {
    const attempt = {
      attemptId: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      quizId,
      quizTitle,
      status: 'in_progress' as const,
      startedAt: new Date().toISOString(),
      totalQuestions,
      answeredQuestions: 0,
    }
    set({
      quiz: {
        ...defaultQuizState,
        currentAttempt: attempt,
        timeRemaining: timeLimit * 60,
        lastSavedAt: new Date().toISOString(),
      },
    })
    trackEvent('quiz_started', { quiz_id: quizId, total_questions: totalQuestions })
  },
  answerQuestion: (questionId: string, answerValue: string) => {
    set(state => {
      const newAnswers = { ...state.quiz.answers, [questionId]: answerValue }
      return {
        quiz: {
          ...state.quiz,
          answers: newAnswers,
          currentAttempt: state.quiz.currentAttempt
            ? { ...state.quiz.currentAttempt, answeredQuestions: Object.keys(newAnswers).length }
            : null,
          lastSavedAt: new Date().toISOString(),
        },
      }
    })
  },
  flagQuestion: questionId => {
    set(state => ({
      quiz: {
        ...state.quiz,
        flaggedQuestions: state.quiz.flaggedQuestions.includes(questionId)
          ? state.quiz.flaggedQuestions
          : [...state.quiz.flaggedQuestions, questionId],
      },
    }))
  },
  unflagQuestion: questionId => {
    set(state => ({
      quiz: {
        ...state.quiz,
        flaggedQuestions: state.quiz.flaggedQuestions.filter(id => id !== questionId),
      },
    }))
  },
  navigateToQuestion: index => {
    set(state => ({
      quiz: {
        ...state.quiz,
        currentQuestionIndex: Math.max(0, Math.min(index, state.quiz.questions.length - 1)),
      },
    }))
  },
  updateQuizTimer: timeRemaining => {
    set(state => ({ quiz: { ...state.quiz, timeRemaining: Math.max(0, timeRemaining) } }))
  },
  setQuizQuestions: (questions, quizInfo) => {
    set(state => ({ quiz: { ...state.quiz, questions, quizInfo, currentQuestionIndex: 0 } }))
  },
  submitQuiz: async () => {
    const state = get()
    if (!state.quiz.currentAttempt) throw new Error('No active quiz attempt')
    set(s => ({ quiz: { ...s.quiz, isSubmitting: true } }))
    // Note: The actual submission to the backend and score calculation is handled directly
    // by QuizPage.tsx. We only need to resolve this for state management consistency.
    return Promise.resolve({ success: true, score: 0 })
  },
  resetQuizState: () => set({ quiz: defaultQuizState }),
  clearQuiz: () => set({ quiz: defaultQuizState }),
  abandonQuiz: () => {
    set(state => ({
      quiz: {
        ...state.quiz,
        currentAttempt: state.quiz.currentAttempt
          ? {
              ...state.quiz.currentAttempt,
              status: 'abandoned',
              completedAt: new Date().toISOString(),
            }
          : null,
      },
    }))
    trackEvent('quiz_abandoned', {
      quiz_id: get().quiz.currentAttempt?.quizId,
      answered_questions: Object.keys(get().quiz.answers).length,
    })
  },
})

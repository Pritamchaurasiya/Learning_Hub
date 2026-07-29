import { StateCreator } from 'zustand'
import { trackEvent } from '../../services/analyticsGA4Service'
import { AppState, QuizSlice } from '../types'
import { quizService } from '../../services/quizService'

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

export const createQuizSlice: StateCreator<AppState & QuizSlice, [], [], QuizSlice> = (
  set,
  get
) => ({
  quiz: defaultQuizState,
  quizStartAttempt: (quizId, quizTitle, totalQuestions, timeLimit) => {
    const attempt = {
      attemptId: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
  quizAnswerQuestion: (questionId: string, answerValue: string) => {
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
  quizFlagQuestion: questionId => {
    set(state => ({
      quiz: {
        ...state.quiz,
        flaggedQuestions: state.quiz.flaggedQuestions.includes(questionId)
          ? state.quiz.flaggedQuestions
          : [...state.quiz.flaggedQuestions, questionId],
      },
    }))
  },
  quizUnflagQuestion: questionId => {
    set(state => ({
      quiz: {
        ...state.quiz,
        flaggedQuestions: state.quiz.flaggedQuestions.filter(id => id !== questionId),
      },
    }))
  },
  quizNavigateToQuestion: index => {
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
  setQuizQuestions: (questions: any[], quizInfo: any) => {
    set(state => ({
      quiz: { ...state.quiz, questions: questions as any[], quizInfo, currentQuestionIndex: 0 },
    }))
  },
  submitQuiz: async () => {
    const state = get()
    const { quiz } = state
    if (!quiz.currentAttempt) throw new Error('No active quiz attempt')

    set(s => ({ quiz: { ...s.quiz, isSubmitting: true } }))

    try {
      const quizId = quiz.quizInfo?.id ?? quiz.currentAttempt.quizId
      const attemptId = quiz.currentAttempt.attemptId
      const timeTaken = quiz.quizInfo ? quiz.quizInfo.time_limit * 60 - quiz.timeRemaining : 0

      const response = await quizService.submitQuiz(
        quizId,
        attemptId,
        Object.fromEntries(Object.entries(quiz.answers).map(([k, v]) => [k, String(v)])),
        timeTaken
      )

      const resultData =
        response && typeof response === 'object' && 'data' in response
          ? (response as { data: Record<string, unknown> }).data
          : (response as Record<string, unknown>)
      const correctCount = Number(resultData?.correct_answers ?? 0)
      const score = Number(resultData?.percentage ?? 0)

      set(s => ({
        quiz: {
          ...s.quiz,
          currentAttempt: s.quiz.currentAttempt
            ? {
                ...s.quiz.currentAttempt,
                status: 'completed' as const,
                completedAt: new Date().toISOString(),
                score,
                correctAnswers: correctCount,
              }
            : null,
          isSubmitting: false,
        },
      }))

      trackEvent('quiz_completed', {
        quiz_id: quizId,
        score,
        correct_answers: correctCount,
        total_questions: quiz.questions.length,
      })

      return { success: true, score }
    } catch (error) {
      set(s => ({ quiz: { ...s.quiz, isSubmitting: false } }))
      throw error
    }
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

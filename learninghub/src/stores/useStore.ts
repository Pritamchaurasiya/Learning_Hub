import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createAuthSlice } from './slices/authSlice'
import { createUISlice } from './slices/uiSlice'
import { createProgressSlice } from './slices/progressSlice'
import { createQuizSlice } from './slices/quizSlice'
import { createTestsASlice } from './slices/testsASlice'
import type { AppState } from './types'

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUISlice(...a),
      ...createProgressSlice(...a),
      ...createQuizSlice(...a),
      ...createTestsASlice(...a),
    }),
    {
      name: 'learninghub-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        theme: state.theme,
        recentSearches: state.recentSearches,
        dailyGoal: state.dailyGoal,
        hasSeenOnboarding: state.hasSeenOnboarding,
        settings: state.settings,
        progress: {
          completedCourses: state.progress.completedCourses,
          bookmarks: state.progress.bookmarks,
          notes: state.progress.notes,
          xp: state.progress.xp,
          level: state.progress.level,
          streak: state.progress.streak,
        },
        achievements: state.achievements,
        // Persist active quiz state for recovery
        quiz:
          state.quiz.currentAttempt?.status === 'in_progress'
            ? {
                currentAttempt: state.quiz.currentAttempt,
                answers: state.quiz.answers,
                flaggedQuestions: state.quiz.flaggedQuestions,
                timeRemaining: state.quiz.timeRemaining,
                currentQuestionIndex: state.quiz.currentQuestionIndex,
                lastSavedAt: state.quiz.lastSavedAt,
              }
            : {
                currentAttempt: null,
                answers: {},
                flaggedQuestions: [],
                timeRemaining: 0,
                questions: [],
                quizInfo: null,
                currentQuestionIndex: 0,
                isSubmitting: false,
                lastSavedAt: null,
              },
        // Persist Tests A+ state for recovery
        testsA:
          state.testsA.isActive && state.testsA.attemptId
            ? {
                isActive: state.testsA.isActive,
                currentQuestionIndex: state.testsA.currentQuestionIndex,
                answers: state.testsA.answers,
                flaggedQuestions: state.testsA.flaggedQuestions,
                timeRemaining: state.testsA.timeRemaining,
                testInfo: state.testsA.testInfo,
                attemptId: state.testsA.attemptId,
                isSubmitting: false,
              }
            : {
                isActive: false,
                currentQuestionIndex: 0,
                answers: {},
                flaggedQuestions: [],
                timeRemaining: 0,
                testInfo: null,
                attemptId: null,
                isSubmitting: false,
              },
      }),
    }
  )
)

export type { AppState }

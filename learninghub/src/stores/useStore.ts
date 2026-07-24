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
        // Persist Auth State
        auth: {
          isAuthenticated: state.auth.isAuthenticated,
          user: state.auth.user,
        },
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
            ? state.quiz
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
        // Persist Tests A+ state for recovery (compact — essential fields only)
        testsA:
          state.testsA.isActive && state.testsA.attemptId
            ? {
                isActive: state.testsA.isActive,
                currentQuestionIndex: state.testsA.currentQuestionIndex,
                questions: [], // Excluded from localStorage to prevent QuotaExceededError
                answers: state.testsA.answers,
                confidences: state.testsA.confidences,
                flaggedQuestions: state.testsA.flaggedQuestions,
                timeRemaining: state.testsA.timeRemaining,
                testInfo: state.testsA.testInfo
                  ? {
                      testId: state.testsA.testInfo.testId,
                      testTitle: state.testsA.testInfo.testTitle,
                      totalQuestions: state.testsA.testInfo.totalQuestions,
                      timeLimit: state.testsA.testInfo.timeLimit,
                    }
                  : null,
                attemptId: state.testsA.attemptId,
                isSubmitting: state.testsA.isSubmitting,
                lastAutosavedAt: state.testsA.lastAutosavedAt,
              }
            : {
                isActive: false,
                currentQuestionIndex: 0,
                questions: [],
                answers: {},
                confidences: {},
                flaggedQuestions: [],
                timeRemaining: 0,
                testInfo: null,
                attemptId: null,
                isSubmitting: false,
                lastAutosavedAt: null,
              },
      }),
      onRehydrateStorage: () => state => {
        state?.setHydrated()
      },
      skipHydration: true,
    }
  )
)

export type { AppState }

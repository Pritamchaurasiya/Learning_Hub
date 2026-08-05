import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createAuthSlice } from './slices/authSlice'
import { createUISlice } from './slices/uiSlice'
import { createProgressSlice } from './slices/progressSlice'
import { createQuizSlice } from './slices/quizSlice'
import { createTestsASlice } from './slices/testsASlice'
import { createTestSlice } from './slices/testSlice'
import type { AppState } from './types'

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUISlice(...a),
      ...createProgressSlice(...a),
      ...createQuizSlice(...a),
      ...createTestsASlice(...a),
      ...createTestSlice(...a),
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
        // Persist unified test state for recovery
        test:
          state.test.isActive && state.test.attempt?.attemptId
            ? {
                mode: state.test.mode,
                isActive: state.test.isActive,
                currentQuestionIndex: state.test.currentQuestionIndex,
                questions: [], // Excluded from localStorage to prevent QuotaExceededError
                answers: state.test.answers,
                confidences: state.test.confidences,
                flaggedQuestions: state.test.flaggedQuestions,
                timeRemaining: state.test.timeRemaining,
                testInfo: state.test.testInfo
                  ? {
                      testId: state.test.testInfo.testId,
                      testTitle: state.test.testInfo.testTitle,
                      totalQuestions: state.test.testInfo.totalQuestions,
                      timeLimit: state.test.testInfo.timeLimit,
                    }
                  : null,
                attempt: state.test.attempt,
                isSubmitting: state.test.isSubmitting,
                lastAutosavedAt: state.test.lastAutosavedAt,
              }
            : {
                mode: 'tests-a',
                isActive: false,
                currentQuestionIndex: 0,
                questions: [],
                answers: {},
                confidences: {},
                flaggedQuestions: [],
                timeRemaining: 0,
                testInfo: null,
                attempt: null,
                isSubmitting: false,
                lastAutosavedAt: null,
              },
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[Hydration] Failed to rehydrate persisted state:', error)
        }
        if (state) {
          state.setHydrated()
        }
      },
    }
  )
)

export type { AppState }

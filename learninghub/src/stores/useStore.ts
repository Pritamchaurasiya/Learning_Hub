import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserProgress, Theme, Achievement, Toast, LoadingState } from '../types'
import type { User } from '../types/user'
import { fetchApi } from '../utils/api'

// Quiz State Types
export interface QuizQuestion {
  id: string
  text: string
  options: string[]
  correctOption: number
  explanation: string
}

export interface QuizInfo {
  id: string
  title: string
  description: string
  time_limit: number
  passing_score: number
  total_questions: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface QuizAttempt {
  attemptId: string
  quizId: string
  quizTitle: string
  status: 'in_progress' | 'completed' | 'abandoned'
  startedAt: string
  completedAt?: string
  score?: number
  totalQuestions: number
  answeredQuestions: number
  correctAnswers?: number
}

export interface QuizState {
  currentAttempt: QuizAttempt | null
  answers: Record<string, number> // questionId -> selectedOption
  flaggedQuestions: string[]
  timeRemaining: number
  questions: QuizQuestion[]
  quizInfo: QuizInfo | null
  currentQuestionIndex: number
  isSubmitting: boolean
  lastSavedAt: string | null
}

const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  // TODO: Replace with actual analytics service (e.g., Google Analytics, Mixpanel)
  // Only log in development, never in production
  if (import.meta.env.DEV) {
    console.log('[Analytics]', eventName, properties)
  }
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

const defaultQuizState: QuizState = {
  currentAttempt: null,
  answers: {},
  flaggedQuestions: [],
  timeRemaining: 0,
  questions: [],
  quizInfo: null,
  currentQuestionIndex: 0,
  isSubmitting: false,
  lastSavedAt: null
}

interface AppState {
  auth: AuthState
  setAuth: (token: string, refreshToken: string | null, user: User) => void
  updateUser: (user: Partial<User>) => void
  logout: () => void
  fetchMe: () => Promise<void>

  theme: Theme
  setTheme: (theme: Theme) => void
  toggleDarkMode: () => void
  
  progress: UserProgress
  completeCourse: (courseId: string, xp: number) => Promise<void>
  setCurrentCourse: (courseId: string | null) => void
  toggleBookmark: (courseId: string) => Promise<void>
  addBookmark: (courseId: string) => Promise<void>
  removeBookmark: (courseId: string) => void
  
  achievements: Achievement[]
  unlockAchievement: (id: string) => void
  
  searchQuery: string
  setSearchQuery: (query: string) => void
  recentSearches: string[]
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  loading: LoadingState
  setLoading: (isLoading: boolean, message?: string) => void

  addNote: (courseId: string, note: string) => void
  updateStreak: () => void
  
  dailyGoal: {
    target: number
    progress: number
    lastReset: string
  }
  updateDailyGoal: (amount: number) => void
  resetDailyGoal: () => void
  hasSeenOnboarding: boolean
  setHasSeenOnboarding: (seen: boolean) => void
  
  settings: {
    notifications: boolean
    soundEffects: boolean
    autoplay: boolean
    compactMode: boolean
  }
  updateSettings: (settings: Partial<AppState['settings']>) => void

  // Quiz State
  quiz: QuizState
  startQuizAttempt: (quizId: string, quizTitle: string, totalQuestions: number, timeLimit: number) => void
  answerQuestion: (questionId: string, optionIndex: number) => void
  flagQuestion: (questionId: string) => void
  unflagQuestion: (questionId: string) => void
  navigateToQuestion: (index: number) => void
  updateQuizTimer: (timeRemaining: number) => void
  setQuizQuestions: (questions: QuizQuestion[], quizInfo: QuizInfo) => void
  submitQuiz: () => Promise<{ success: boolean; score: number }>
  resetQuizState: () => void
  abandonQuiz: () => void
}

const defaultProgress: UserProgress = {
  completedCourses: [],
  currentCourse: null,
  xp: 0,
  level: 1,
  streak: 0,
  lastActive: new Date().toISOString(),
  bookmarks: [],
  notes: {},
}

const defaultAchievements: Achievement[] = [
  { id: 'first-course', name: 'First Steps', description: 'Complete your first course', icon: '🎯', unlocked: false },
  { id: 'streak-3', name: 'Consistent', description: 'Maintain a 3-day streak', icon: '🔥', unlocked: false },
  { id: 'all-phase-1', name: 'Beginner Master', description: 'Complete all Phase 1 courses', icon: '🎓', unlocked: false },
]

let toastCounter = 0
function generateToastId(): string {
  toastCounter += 1
  return `toast-${Date.now()}-${toastCounter}`
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      auth: { isAuthenticated: !!localStorage.getItem('token'), user: null },
      setAuth: (token, refreshToken, user) => {
        localStorage.setItem('token', token)
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
        set({ auth: { isAuthenticated: true, user } })
        trackEvent('user_authenticated', { user_id: user?.id })
      },
      updateUser: (userData) => {
        set((state) => ({
          auth: {
            ...state.auth,
            user: state.auth.user ? { ...state.auth.user, ...userData } : null
          }
        }))
      },
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        trackEvent('user_logged_out')
        set({ auth: { isAuthenticated: false, user: null }, progress: defaultProgress })
      },
      fetchMe: async () => {
        try {
          const response = await fetchApi('/auth/me');
          // Backend returns { status, data: { id, email, username, ... } }
          const userData = response.data || response.user || response;
          
          set((state) => ({
            auth: { isAuthenticated: true, user: userData },
            progress: {
              ...state.progress,
              xp: userData.xp || state.progress.xp || 0,
              level: userData.level || state.progress.level || 1,
              streak: userData.streak || state.progress.streak || 0,
              lastActive: userData.lastActive || userData.last_login_at || new Date().toISOString(),
            }
          }));
        } catch (err) {
          // Only logout on auth errors, not network errors
          if (err instanceof Error && (err.message === 'Unauthorized' || err.message.includes('Session expired'))) {
            get().logout();
          }
          throw err;
        }
      },

      theme: { mode: 'system' },
      setTheme: (theme) => set({ theme }),
      toggleDarkMode: () => {
        const current = get().theme.mode
        let newMode: 'light' | 'dark' | 'system' = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
        set({ theme: { mode: newMode } })
      },
      
      progress: defaultProgress,
      completeCourse: async (courseId, xp) => {
        const isAlreadyCompleted = get().progress.completedCourses.includes(courseId);
        if (isAlreadyCompleted) return;

        // Check for first-course achievement before updating
        const isFirstCourse = get().progress.completedCourses.length === 0;

        // Optimistic local update — always succeeds
        set((state) => ({
          loading: { isLoading: true, message: 'Saving progress...' },
          progress: {
            ...state.progress,
            completedCourses: [...state.progress.completedCourses, courseId],
            xp: state.progress.xp + xp,
            level: Math.floor((state.progress.xp + xp) / 100) + 1,
          }
        }));

        get().addToast({ message: `Course completed! +${xp} XP`, type: 'success' });
        trackEvent('course_completed', { course_id: courseId, xp });

        if (isFirstCourse) {
          get().unlockAchievement('first-course');
        }
        get().updateDailyGoal(xp);

        // Sync with backend (non-blocking)
        try {
          await fetchApi('/gamification/award-xp/', {
            method: 'POST',
            body: JSON.stringify({ amount: xp, reason: `Completed course: ${courseId}` })
          });
        } catch (err) {
          // Backend sync failed — local state is already updated
          if (import.meta.env.DEV) {
            console.warn('[Store] Backend sync for course completion failed (local state preserved):', err);
          }
        } finally {
          set({ loading: { isLoading: false } });
        }
      },
      setCurrentCourse: (courseId) => {
        set((state) => ({ progress: { ...state.progress, currentCourse: courseId } }))
      },
      toggleBookmark: async (courseId) => {
        const isBookmarked = get().progress.bookmarks.includes(courseId);

        // Optimistic local toggle
        set((state) => {
          const newBookmarks = isBookmarked
            ? state.progress.bookmarks.filter(id => id !== courseId)
            : [...state.progress.bookmarks, courseId];
          return { progress: { ...state.progress, bookmarks: newBookmarks } };
        });

        get().addToast({ message: isBookmarked ? 'Bookmark removed' : 'Bookmark added', type: 'success' });
        trackEvent('bookmark_toggled', { course_id: courseId });

        // Sync with backend using correct API endpoint
        try {
          if (isBookmarked) {
            await fetchApi(`/users/bookmarks/${courseId}`, { method: 'DELETE' });
          } else {
            await fetchApi('/users/bookmarks', {
              method: 'POST',
              body: JSON.stringify({ course_id: courseId }),
            });
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Store] Backend bookmark sync failed (local state preserved):', err);
          }
        }
      },
      addBookmark: async (courseId) => {
        if (get().progress.bookmarks.includes(courseId)) return;

        // Optimistic local update
        set((state) => ({
          progress: { ...state.progress, bookmarks: [...state.progress.bookmarks, courseId] }
        }));
        get().addToast({ message: 'Added to bookmarks', type: 'success' });
        trackEvent('bookmark_added', { course_id: courseId });

        // Sync with backend using correct API endpoint
        try {
          await fetchApi('/users/bookmarks', {
            method: 'POST',
            body: JSON.stringify({ course_id: courseId }),
          });
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Store] Backend bookmark add failed (local state preserved):', err);
          }
        }
      },
      removeBookmark: async (courseId) => {
        // Optimistic local update
        set((state) => ({
          progress: { ...state.progress, bookmarks: state.progress.bookmarks.filter(id => id !== courseId) }
        }));
        trackEvent('bookmark_removed', { course_id: courseId });

        // Sync with backend using correct API endpoint
        try {
          await fetchApi(`/users/bookmarks/${courseId}`, { method: 'DELETE' });
        } catch (err) {
          if (import.meta.env.DEV) {
            console.warn('[Store] Backend bookmark remove failed (local state preserved):', err);
          }
        }
      },
      
      achievements: defaultAchievements,
      unlockAchievement: (id) => {
        set((state) => ({
          achievements: state.achievements.map(a => 
            a.id === id ? { ...a, unlocked: true } : a
          )
        }));
        const achievement = get().achievements.find(a => a.id === id);
        if (achievement) {
          get().addToast({ 
            message: `Achievement Unlocked: ${achievement.name}`, 
            type: 'success',
            duration: 5000 
          });
        }
      },
      
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      recentSearches: [],
      addRecentSearch: (query) => {
        if (!query.trim()) return
        trackEvent('search_performed', { query })
        set((state) => ({
          recentSearches: [query, ...state.recentSearches.filter((s) => s !== query)].slice(0, 10),
        }))
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
      
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toasts: [],
      addToast: (toast) => {
        const id = generateToastId()
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
        setTimeout(() => { get().removeToast(id) }, toast.duration || 3000)
      },
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      },

      loading: { isLoading: false },
      setLoading: (isLoading, message) => set({ loading: { isLoading, message } }),

      addNote: (courseId, note) => {
        set((state) => ({ progress: { ...state.progress, notes: { ...state.progress.notes, [courseId]: note } } }));
      },
      updateStreak: async () => {
        if (get().auth.isAuthenticated) {
          // Update local streak optimistically
          set((state) => ({
            progress: { ...state.progress, streak: state.progress.streak + 1, lastActive: new Date().toISOString() }
          }));
          // Sync with backend (non-blocking)
          try {
            await fetchApi('/gamification/streak', { method: 'POST' });
          } catch {
            if (import.meta.env.DEV) {
              console.warn('[Store] Backend streak sync failed (local state preserved)');
            }
          }
        }
      },
      dailyGoal: {
        target: 50,
        progress: 0,
        lastReset: new Date().toISOString()
      },
      updateDailyGoal: (amount) => {
        set((state) => {
          const newProgress = state.dailyGoal.progress + amount;
          if (newProgress >= state.dailyGoal.target && state.dailyGoal.progress < state.dailyGoal.target) {
            get().addToast({ message: 'Daily goal achieved! 🎉', type: 'success' });
          }
          return { dailyGoal: { ...state.dailyGoal, progress: newProgress } };
        });
      },
      resetDailyGoal: () => {
        set({ dailyGoal: { target: 50, progress: 0, lastReset: new Date().toISOString() } });
      },
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      
      settings: {
        notifications: true,
        soundEffects: true,
        autoplay: false,
        compactMode: false,
      },
      updateSettings: (newSettings) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
      },

      // Quiz State
      quiz: defaultQuizState,
      
      startQuizAttempt: (quizId, quizTitle, totalQuestions, timeLimit) => {
        const attempt: QuizAttempt = {
          attemptId: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          quizId,
          quizTitle,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          totalQuestions,
          answeredQuestions: 0,
        };
        
        set({
          quiz: {
            ...defaultQuizState,
            currentAttempt: attempt,
            timeRemaining: timeLimit * 60, // Convert minutes to seconds
            lastSavedAt: new Date().toISOString(),
          }
        });
        
        trackEvent('quiz_started', { quiz_id: quizId, total_questions: totalQuestions });
      },
      
      answerQuestion: (questionId, optionIndex) => {
        set((state) => {
          const newAnswers = { ...state.quiz.answers, [questionId]: optionIndex };
          const answeredCount = Object.keys(newAnswers).length;
          
          return {
            quiz: {
              ...state.quiz,
              answers: newAnswers,
              currentAttempt: state.quiz.currentAttempt ? {
                ...state.quiz.currentAttempt,
                answeredQuestions: answeredCount,
                lastSavedAt: new Date().toISOString(),
              } : null,
              lastSavedAt: new Date().toISOString(),
            }
          };
        });
      },
      
      flagQuestion: (questionId) => {
        set((state) => ({
          quiz: {
            ...state.quiz,
            flaggedQuestions: state.quiz.flaggedQuestions.includes(questionId)
              ? state.quiz.flaggedQuestions
              : [...state.quiz.flaggedQuestions, questionId],
          }
        }));
      },
      
      unflagQuestion: (questionId) => {
        set((state) => ({
          quiz: {
            ...state.quiz,
            flaggedQuestions: state.quiz.flaggedQuestions.filter(id => id !== questionId),
          }
        }));
      },
      
      navigateToQuestion: (index) => {
        set((state) => ({
          quiz: {
            ...state.quiz,
            currentQuestionIndex: Math.max(0, Math.min(index, state.quiz.questions.length - 1)),
          }
        }));
      },
      
      updateQuizTimer: (timeRemaining) => {
        set((state) => ({
          quiz: {
            ...state.quiz,
            timeRemaining: Math.max(0, timeRemaining),
          }
        }));
      },
      
      setQuizQuestions: (questions, quizInfo) => {
        set((state) => ({
          quiz: {
            ...state.quiz,
            questions,
            quizInfo,
            currentQuestionIndex: 0,
          }
        }));
      },
      
      submitQuiz: async () => {
        const state = get();
        if (!state.quiz.currentAttempt) {
          throw new Error('No active quiz attempt');
        }
        
        set({ quiz: { ...state.quiz, isSubmitting: true } });
        
        try {
          // Calculate score
          let correctCount = 0;
          state.quiz.questions.forEach((q) => {
            if (state.quiz.answers[q.id] === q.correctOption) {
              correctCount++;
            }
          });
          
          const score = Math.round((correctCount / state.quiz.questions.length) * 100);
          
          // TODO: Send submission to backend
          // await quizService.submitQuiz(state.quiz.currentAttempt.attemptId, state.quiz.answers);
          
          set((s) => ({
            quiz: {
              ...s.quiz,
              currentAttempt: s.quiz.currentAttempt ? {
                ...s.quiz.currentAttempt,
                status: 'completed',
                completedAt: new Date().toISOString(),
                score,
                correctAnswers: correctCount,
              } : null,
              isSubmitting: false,
            }
          }));
          
          trackEvent('quiz_completed', {
            quiz_id: state.quiz.currentAttempt.quizId,
            score,
            correct_answers: correctCount,
            total_questions: state.quiz.questions.length,
          });
          
          return { success: true, score };
        } catch (error) {
          set({ quiz: { ...state.quiz, isSubmitting: false } });
          throw error;
        }
      },
      
      resetQuizState: () => {
        set({ quiz: defaultQuizState });
      },
      
      abandonQuiz: () => {
        set((state) => ({
          quiz: {
            ...state.quiz,
            currentAttempt: state.quiz.currentAttempt ? {
              ...state.quiz.currentAttempt,
              status: 'abandoned',
              completedAt: new Date().toISOString(),
            } : null,
          }
        }));
        
        trackEvent('quiz_abandoned', {
          quiz_id: get().quiz.currentAttempt?.quizId,
          answered_questions: Object.keys(get().quiz.answers).length,
        });
      },
    }),
    {
      name: 'learninghub-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
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
        quiz: state.quiz.currentAttempt?.status === 'in_progress' ? {
          currentAttempt: state.quiz.currentAttempt,
          answers: state.quiz.answers,
          flaggedQuestions: state.quiz.flaggedQuestions,
          timeRemaining: state.quiz.timeRemaining,
          currentQuestionIndex: state.quiz.currentQuestionIndex,
          lastSavedAt: state.quiz.lastSavedAt,
        } : defaultQuizState,
      }),
    }
  )
)
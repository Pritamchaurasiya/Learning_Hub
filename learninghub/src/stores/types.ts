import type { User } from '../types/user'
import type { UserProgress, Theme, Achievement, Toast, LoadingState, Notification } from '../types'
import type { TestQuestion, TestResult } from '../services/testsAService'

export type { User, UserProgress, Theme, Achievement, Toast, LoadingState, Notification }

// Quiz Types
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
  answers: Record<string, string | number>
  flaggedQuestions: string[]
  timeRemaining: number
  questions: QuizQuestion[]
  quizInfo: QuizInfo | null
  currentQuestionIndex: number
  isSubmitting: boolean
  lastSavedAt: string | null
}

// Slice Interfaces
export interface AuthSlice {
  auth: {
    isAuthenticated: boolean
    user: User | null
  }
  setAuth: (token: string, refreshToken: string | null, user: User) => void
  updateUser: (user: Partial<User>) => void
  logout: () => void
  fetchMe: () => Promise<void>
}

export interface UISlice {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleDarkMode: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  loading: LoadingState
  setLoading: (isLoading: boolean, message?: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  recentSearches: string[]
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  settings: {
    notifications: boolean
    soundEffects: boolean
    autoplay: boolean
    compactMode: boolean
    lowPerformanceMode: boolean
  }
  updateSettings: (settings: Partial<UISlice['settings']>) => void
  hasSeenOnboarding: boolean
  setHasSeenOnboarding: (seen: boolean) => void
}

export interface ProgressSlice {
  progress: UserProgress
  completeCourse: (courseId: string, xp: number) => Promise<void>
  setCurrentCourse: (courseId: string | null) => void
  toggleBookmark: (courseId: string) => Promise<void>
  addBookmark: (courseId: string) => Promise<void>
  removeBookmark: (courseId: string) => void
  addNote: (courseId: string, note: string) => void
  updateStreak: () => void
  achievements: Achievement[]
  unlockAchievement: (id: string) => void
  dailyGoal: {
    target: number
    progress: number
    lastReset: string
  }
  updateDailyGoal: (amount: number) => void
  resetDailyGoal: () => void
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markNotificationAsRead: (id: string) => void
  markAllNotificationsAsRead: () => void
  clearNotifications: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void
}

export interface QuizSlice {
  quiz: QuizState
  startQuizAttempt: (
    quizId: string,
    quizTitle: string,
    totalQuestions: number,
    timeLimit: number
  ) => void
  answerQuestion: (questionId: string, answerValue: string) => void
  flagQuestion: (questionId: string) => void
  unflagQuestion: (questionId: string) => void
  navigateToQuestion: (index: number) => void
  updateQuizTimer: (timeRemaining: number) => void
  setQuizQuestions: (questions: QuizQuestion[], quizInfo: QuizInfo) => void
  submitQuiz: () => Promise<{ success: boolean; score: number }>
  resetQuizState: () => void
  clearQuiz: () => void
  abandonQuiz: () => void
}

// Tests A+ Slice
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

// Tests A+ State
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

export interface TestInfo {
  testId: string
  testTitle: string
  totalQuestions: number
  timeLimit: number
}

export type AppState = AuthSlice & UISlice & ProgressSlice & QuizSlice & TestsASlice

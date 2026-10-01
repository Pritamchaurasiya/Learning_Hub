import type { User } from '../types/user'
import type { UserProgress, Theme, Achievement, Toast, LoadingState, Notification } from '../types'
import type { TestQuestion, TestResult, TestSection } from '../services/testsAService'

export type { User, UserProgress, Theme, Achievement, Toast, LoadingState, Notification }
export type { TestQuestion, TestResult, TestSection }

// Quiz Types (Legacy - deprecated, use TestQuestion instead)
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
  questions: QuizQuestion[] | TestQuestion[]
  quizInfo: QuizInfo | TestInfo | null
  currentQuestionIndex: number
  isSubmitting: boolean
  lastSavedAt: string | null
}

// ─── Unified Test Types (New) ────────────────────────────────────────────────

export type TestMode =
  'legacy' | 'tests-a' | 'quiz' | 'mock' | 'adaptive' | 'subjective' | 'sectional'

export interface TestInfo {
  testId: string
  testTitle: string
  totalQuestions: number
  timeLimit: number
  sections?: TestSection[]
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
  mode: TestMode
  isActive: boolean
  isLoading: boolean
  error: string | null
  currentQuestionIndex: number
  questions: TestQuestion[]
  answers: Record<string, string | string[]>
  confidences: Record<string, string>
  flaggedQuestions: string[]
  timeRemaining: number
  testInfo: TestInfo | null
  attempt: TestAttemptState | null
  results: TestResult | null
  isSubmitting: boolean
  lastAutosavedAt: string | null
  autosaveStatus?: 'saved' | 'saving' | 'retrying' | 'offline' | 'recovered' | 'idle' | 'error'
  sections: TestSection[]
  activeSectionId: string | null
  lockedSectionIds?: string[]
  sectionTimeRemaining?: Record<string, number>
  // Assessment modes state
  assessmentMode: 'ai' | 'non_ai' | 'offline' | 'adaptive' | 'contest' | 'practice'
  adaptiveTheta: number
  adaptiveSem: number
  isOfflineMode: boolean
  pendingSyncCount: number
  isContestMode: boolean
  proctorViolations: number
  practiceFeedback: Record<string, { isCorrect: boolean; explanation: string; points: number }>
  // Legacy compatibility
  currentAttempt: TestAttemptState | null
  quizInfo: TestInfo | null
}

// Slice Interfaces
export interface AuthSlice {
  auth: {
    isAuthenticated: boolean
    user: User | null
    isHydrated: boolean
  }
  setAuth: (token: string, refreshToken: string | null, user: User) => void
  setHydrated: () => void
  updateUser: (user: Partial<User>) => void
  logout: () => Promise<void>
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
    // Master toggle
    notifications: boolean
    // Individual notification & UI flags
    dailyReminder?: boolean
    progressUpdates?: boolean
    achievements?: boolean
    weeklyDigest?: boolean
    soundEffects?: boolean
    autoplay?: boolean
    compactMode?: boolean
    lowPerformanceMode?: boolean
    // Privacy flags
    showProfile?: boolean
    showProgress?: boolean
    showStreak?: boolean
  }
  updateSettings: (
    settings: Partial<{
      notifications: boolean
      dailyReminder: boolean
      progressUpdates: boolean
      achievements: boolean
      weeklyDigest: boolean
      soundEffects: boolean
      autoplay: boolean
      compactMode: boolean
      lowPerformanceMode: boolean
      showProfile: boolean
      showProgress: boolean
      showStreak: boolean
    }>
  ) => void
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
  addNotification: (
    notification: Omit<Notification, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ) => void
}

// Tests A+ Slice (Deprecated - use TestSlice instead)
export interface TestsASlice {
  testsA: TestsAState
  startTestAttempt: (
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
  setAutosaveStatus: (status: 'saved' | 'saving' | 'retrying' | 'offline' | 'recovered') => void
  updateSubjectiveGrade: (payload: {
    questionId: string
    marksObtained: number
    isCorrect: boolean
    aiFeedback?: string
    newTotalScore?: number
    percentage: number
    passed: boolean
  }) => void
}

// Tests A+ State (Deprecated)
export interface TestsAState {
  mode?: TestMode
  isActive: boolean
  currentQuestionIndex: number
  questions: TestQuestion[]
  answers: Record<string, string | string[]>
  confidences: Record<string, string>
  flaggedQuestions: string[]
  timeRemaining: number
  testInfo: TestInfo | null
  attemptId: string | null
  isLoading: boolean
  error: string | null
  results: TestResult | null
  isSubmitting: boolean
  lastAutosavedAt: number | string | null
  autosaveStatus?: 'saved' | 'saving' | 'retrying' | 'offline' | 'recovered'
  attempt?: TestAttemptState | null
  currentAttempt?: TestAttemptState | null
  quizInfo?: TestInfo | null
}

// New Unified Test Slice
export interface TestSlice {
  test: UnifiedTestState
  testsA: TestsAState
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
  setActiveSection: (sectionId: string | null) => void
  updateTestTimer: (timeRemaining: number) => void
  setTestQuestions: (
    questions: TestQuestion[],
    testInfo: TestInfo,
    attemptId: string,
    initialAnswers?: Record<string, string>,
    timeRemaining?: number,
    sections?: TestSection[]
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
  setAssessmentMode: (
    mode: 'ai' | 'non_ai' | 'offline' | 'adaptive' | 'contest' | 'practice'
  ) => void
  setAdaptiveMetrics: (theta: number, sem: number) => void
  stepAdaptiveQuestion: (nextQuestion: TestQuestion) => void
  recordProctorViolation: () => void
  setPendingSyncCount: (count: number) => void
  setPracticeFeedback: (
    questionId: string,
    feedback: { isCorrect: boolean; explanation: string; points: number }
  ) => void
  lockSection: (sectionId: string) => void
  updateSectionTimer: (sectionId: string, timeRemaining: number) => void
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
  setQuizQuestions: (
    questions: QuizQuestion[] | TestQuestion[],
    quizInfo: QuizInfo | TestInfo
  ) => void
  submitQuiz: () => Promise<{ success: boolean; score: number }>
  resetQuizState: () => void
  clearQuiz: () => void
  abandonQuiz: () => void
  startTestAttempt: (
    testId: string,
    testTitle: string,
    totalQuestions: number,
    timeLimit: number
  ) => void
}

export type AppState = AuthSlice & UISlice & ProgressSlice & TestsASlice & TestSlice

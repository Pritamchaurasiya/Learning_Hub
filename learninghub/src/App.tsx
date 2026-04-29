import { useEffect, lazy, Suspense, ReactNode } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useStore } from './stores/useStore'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import OnboardingWizard from './components/OnboardingWizard'
import './index.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const CoursePage = lazy(() => import('./pages/CoursePage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ContestPage = lazy(() => import('./pages/ContestPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const LessonPlayerPage = lazy(() => import('./pages/LessonPlayerPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'))
const CertificatesPage = lazy(() => import('./pages/CertificatesPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const DiscussionsPage = lazy(() => import('./pages/DiscussionsPage'))
const LearningPathPage = lazy(() => import('./pages/LearningPathPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const MentorshipPage = lazy(() => import('./pages/MentorshipPage'))
const AITutorPage = lazy(() => import('./pages/AITutorPage'))
const LiveClassPage = lazy(() => import('./pages/LiveClassPage'))
const StudyPlannerPage = lazy(() => import('./pages/StudyPlannerPage'))
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'))

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50 dark:bg-gray-950">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-[3px] border-primary-500/20" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-primary-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">LearningHub</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">Initializing your learning environment...</p>
      </div>
    </div>
  )
}


function ProtectedRoute({ children }: { children: ReactNode }) {
  const { auth } = useStore();
  const location = useLocation();
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { auth } = useStore();
  const location = useLocation();
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  if (auth.user?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            You do not have the necessary permissions to access the administrator portal.
          </p>
        </div>
      </Layout>
    );
  }
  return <Layout>{children}</Layout>;
}

function App() {
  const { theme, auth, fetchMe } = useStore()

  useEffect(() => {
    if (auth.isAuthenticated && !auth.user) {
       fetchMe()
    }
  }, [auth.isAuthenticated, auth.user, fetchMe])

  useEffect(() => {
    if (theme.mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme.mode === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }, [theme.mode])

  const location = useLocation()

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="sync" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/course/:courseId" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />
              <Route path="/course/:courseId/lesson/:lessonId" element={<ProtectedRoute><LessonPlayerPage /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
              <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
              <Route path="/problems" element={<ProtectedRoute><ProblemsPage /></ProtectedRoute>} />
              <Route path="/problem/:slug" element={<ProtectedRoute><ProblemsPage /></ProtectedRoute>} />
              <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/contest" element={<ProtectedRoute><ContestPage /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/downloads" element={<ProtectedRoute><DownloadsPage /></ProtectedRoute>} />
              <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
              <Route path="/discussions" element={<ProtectedRoute><DiscussionsPage /></ProtectedRoute>} />
              <Route path="/learning-path" element={<ProtectedRoute><LearningPathPage /></ProtectedRoute>} />
              <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route path="/mentorship" element={<ProtectedRoute><MentorshipPage /></ProtectedRoute>} />
              <Route path="/ai-tutor" element={<ProtectedRoute><AITutorPage /></ProtectedRoute>} />
              <Route path="/live-class" element={<ProtectedRoute><LiveClassPage /></ProtectedRoute>} />
              <Route path="/study-planner" element={<ProtectedRoute><StudyPlannerPage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/monitoring" element={<AdminRoute><MonitoringPage /></AdminRoute>} />
              <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
        <OnboardingWizard />
      </div>
    </ErrorBoundary>
  )
}

export default App

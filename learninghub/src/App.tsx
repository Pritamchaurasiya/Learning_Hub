import { useEffect, lazy, Suspense, ReactNode, cloneElement } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from './stores/useStore'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import OnboardingWizard from './components/OnboardingWizard'
import { AdminRoute } from './components/AdminRoute'
import { ToastContainer } from './components/ui/Toast'
import { CookieConsent } from './components/CookieConsent'
import { initializeGA4, trackPageView } from './services/analyticsGA4Service'
import { ScrollRestoration } from './components/ScrollRestoration'
import './index.css'

const HomePage = lazy(() => import('./pages/HomePage'))
const CoursePage = lazy(() => import('./pages/CoursePage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const QuizHistoryPage = lazy(() => import('./pages/QuizHistoryPage'))
const TestsAPage = lazy(() => import('./pages/TestsAPage'))
const TestsAHistoryPage = lazy(() => import('./pages/TestsAHistoryPage'))
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

function LoadingScreen({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 bg-transparent ${fullScreen ? 'min-h-screen' : 'min-h-[50vh] py-20'}`}
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-[3px] border-primary-500/20" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-t-primary-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600">
          LearningHub
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">
          Initializing your learning environment...
        </p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, ...props }: { children: ReactNode; [key: string]: any }) {
  const { auth } = useStore()
  const location = useLocation()
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          {cloneElement(children as React.ReactElement, props)}
        </Suspense>
      </ErrorBoundary>
    </Layout>
  )
}

// Public route - accessible without auth, redirects to dashboard if authenticated
function PublicRoute({ children }: { children: ReactNode }) {
  const { auth } = useStore()
  const location = useLocation()
  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" state={{ from: location }} replace />
  }
  return children
}

function App() {
  const theme = useStore(s => s.theme)
  const auth = useStore(s => s.auth)
  const fetchMe = useStore(s => s.fetchMe)
  const logout = useStore(s => s.logout)
  const addToast = useStore(s => s.addToast)
  const location = useLocation()
  const navigate = useNavigate()

  // Listen for session-expired / unauthorized events from api.ts
  useEffect(() => {
    const handleSessionExpired = () => {
      logout()
      addToast({ message: 'Session expired. Please log in again.', type: 'warning' })
      navigate('/auth', { replace: true })
    }
    const handleUnauthorized = () => {
      logout()
      addToast({ message: 'You have been logged out.', type: 'info' })
      navigate('/auth', { replace: true })
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [logout, addToast, navigate])

  useEffect(() => {
    if (auth.isAuthenticated && !auth.user) {
      void fetchMe()
    }
  }, [auth.isAuthenticated, auth.user, fetchMe])

  // Initialize Google Analytics 4 on app load
  useEffect(() => {
    initializeGA4()
  }, [])

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location.pathname, location.search])

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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
        <ScrollRestoration />
        <Suspense fallback={<LoadingScreen fullScreen={true} />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <PublicRoute>
                  <HomePage />
                </PublicRoute>
              }
            />
            {/* Dashboard redirect - default logged-in landing */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute children={<HomePage isDashboard />} />}
            />
            <Route
              path="/course/:courseId"
              element={
                <ProtectedRoute>
                  <CoursePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course/:courseId/lesson/:lessonId"
              element={
                <ProtectedRoute>
                  <LessonPlayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <BookmarksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <AchievementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problems"
              element={
                <ProtectedRoute>
                  <ProblemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/problem/:slug"
              element={
                <ProtectedRoute>
                  <ProblemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:quizId"
              element={
                <ProtectedRoute>
                  <QuizPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz-history"
              element={
                <ProtectedRoute>
                  <QuizHistoryPage />
                </ProtectedRoute>
              }
            />
            {/* Tests A+ Routes */}
            <Route
              path="/tests-a"
              element={
                <ProtectedRoute>
                  <TestsAPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests-a/:testId"
              element={
                <ProtectedRoute>
                  <TestsAPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tests-a-history"
              element={
                <ProtectedRoute>
                  <TestsAHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contest"
              element={
                <ProtectedRoute>
                  <ContestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <LibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/downloads"
              element={
                <ProtectedRoute>
                  <DownloadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/certificates"
              element={
                <ProtectedRoute>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discussions"
              element={
                <ProtectedRoute>
                  <DiscussionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learning-path"
              element={
                <ProtectedRoute>
                  <LearningPathPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mentorship"
              element={
                <ProtectedRoute>
                  <MentorshipPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-tutor"
              element={
                <ProtectedRoute>
                  <AITutorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-class"
              element={
                <ProtectedRoute>
                  <LiveClassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-planner"
              element={
                <ProtectedRoute>
                  <StudyPlannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <AdminPage />
                    </Suspense>
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="/monitoring"
              element={
                <AdminRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <MonitoringPage />
                    </Suspense>
                  </Layout>
                </AdminRoute>
              }
            />
            <Route
              path="*"
              element={
                <Layout>
                  <NotFoundPage />
                </Layout>
              }
            />
          </Routes>
        </Suspense>
        <OnboardingWizard />
        <ToastContainer />
        <CookieConsent />
      </div>
    </ErrorBoundary>
  )
}

export default App

import { useEffect, lazy, Suspense, ReactNode } from 'react'
import { Routes, Route, useLocation, Navigate, useNavigate, Outlet } from 'react-router-dom'
import { useStore } from './stores/useStore'
import Layout from './components/Layout'
import { LoadingScreen } from './components/ui/LoadingScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import OnboardingWizard from './components/OnboardingWizard'
import { AdminRoute } from './components/AdminRoute'
import { ToastContainer } from './components/ui/Toast'
import { CookieConsent } from './components/CookieConsent'
import { initializeGA4, trackPageView } from './services/analyticsGA4Service'
import { ScrollRestoration } from './components/ScrollRestoration'
import { LazyRoute } from './components/LazyRoute'
import { useNotificationConnection } from './hooks/useNotificationConnection'
import ReloadPrompt from './components/ReloadPrompt'
import { AITutorContextWidget } from './components/AITutorContextWidget'
import './index.css'

// Critical pages — eager loaded for instant navigation
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import CoursePage from './pages/CoursePage'
import ProfilePage from './pages/ProfilePage'
import TestsAPage from './pages/TestsAPage'

// Secondary pages — lazy loaded
const SearchPage = lazy(() => import('./pages/SearchPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'))
const ProblemWorkspacePage = lazy(() => import('./pages/ProblemWorkspacePage'))

const TestsAHistoryPage = lazy(() => import('./pages/TestsAHistoryPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminCoursesPage = lazy(() => import('./pages/AdminCoursesPage'))
const AdminAILabPage = lazy(() => import('./pages/AdminAILabPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ContestPage = lazy(() => import('./pages/ContestPage'))
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
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'))
const MentorshipPage = lazy(() => import('./pages/MentorshipPage'))
const AITutorPage = lazy(() => import('./pages/AITutorPage'))
const LiveClassPage = lazy(() => import('./pages/LiveClassPage'))
const StudyPlannerPage = lazy(() => import('./pages/StudyPlannerPage'))
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'))
const AdminABTestingPage = lazy(() => import('./pages/AdminABTestingPage'))
const OfflinePage = lazy(() => import('./pages/OfflinePage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))

function ProtectedLayout() {
  const auth = useStore(state => state.auth)
  const location = useLocation()

  if (!auth.isHydrated) {
    return <LoadingScreen fullScreen={true} />
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  return (
    <Layout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      <AITutorContextWidget />
    </Layout>
  )
}

function PublicRoute({ children }: { children: ReactNode }) {
  const auth = useStore(state => state.auth)
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

  // Activate real-time WebSocket notifications when authenticated
  useNotificationConnection()

  // Listen for session-expired events from api.ts
  useEffect(() => {
    const handleSessionExpired = () => {
      void logout()
      addToast({ message: 'Session expired. Please log in again.', type: 'warning' })
      navigate('/auth', { replace: true })
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [logout, addToast, navigate])

  useEffect(() => {
    if (auth.isAuthenticated && !auth.user) {
      fetchMe().catch(() => {
        // fetchMe already handles errors internally — this catch prevents
        // unhandled promise rejections from the re-throw in authSlice
      })
    }
  }, [auth.isAuthenticated, auth.user, fetchMe])

  // Initialize Google Analytics 4 on app load
  useEffect(() => {
    try {
      initializeGA4()
    } catch {
      if (import.meta.env.DEV) {
        console.warn('[App] GA4 initialization skipped')
      }
    }
  }, [])

  // Track page views on route changes
  useEffect(() => {
    try {
      trackPageView(location.pathname + location.search)
    } catch {
      // silently ignore GA4 errors
    }
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
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <PublicRoute>
                  <HomePage />
                </PublicRoute>
              }
            />

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<HomePage isDashboard />} />
              <Route path="/courses" element={<SearchPage />} />
              <Route path="/course/:courseId" element={<CoursePage />} />
              <Route path="/course/:courseId/lesson/:lessonId" element={<LessonPlayerPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/problems" element={<ProblemsPage />} />
              <Route path="/problem/:slug" element={<ProblemWorkspacePage />} />
              <Route path="/quiz" element={<Navigate to="/tests-a" replace />} />
              <Route path="/quiz/:quizId" element={<Navigate to="/tests-a" replace />} />
              <Route path="/quiz-history" element={<Navigate to="/tests-a-history" replace />} />
              <Route path="/tests-a" element={<TestsAPage />} />
              <Route path="/tests-a/:testId" element={<TestsAPage />} />
              <Route path="/tests-a-history" element={<TestsAHistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/contest" element={<ContestPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/discussions" element={<DiscussionsPage />} />
              <Route path="/learning-path" element={<LearningPathPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/payment/cancel" element={<PaymentCancelPage />} />
              <Route path="/mentorship" element={<MentorshipPage />} />
              <Route path="/ai-tutor" element={<AITutorPage />} />
              <Route path="/live-class" element={<LiveClassPage />} />
              <Route path="/study-planner" element={<StudyPlannerPage />} />
              <Route path="/offline" element={<OfflinePage />} />
              <Route path="/pricing" element={<PricingPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Layout />
                </AdminRoute>
              }
            >
              <Route
                index
                element={
                  <LazyRoute sectionName="Admin Dashboard">
                    <AdminPage />
                  </LazyRoute>
                }
              />
              <Route
                path="users"
                element={
                  <LazyRoute sectionName="Admin Users">
                    <AdminUsersPage />
                  </LazyRoute>
                }
              />
              <Route
                path="courses"
                element={
                  <LazyRoute sectionName="Admin Courses">
                    <AdminCoursesPage />
                  </LazyRoute>
                }
              />
              <Route
                path="ai-lab"
                element={
                  <LazyRoute sectionName="AI Lab">
                    <AdminAILabPage />
                  </LazyRoute>
                }
              />
              <Route
                path="analytics"
                element={
                  <LazyRoute sectionName="Admin Analytics">
                    <AdminAnalyticsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="ab-testing"
                element={
                  <LazyRoute sectionName="A/B Testing">
                    <AdminABTestingPage />
                  </LazyRoute>
                }
              />
            </Route>
            <Route
              path="/monitoring"
              element={
                <AdminRoute>
                  <Layout />
                </AdminRoute>
              }
            >
              <Route
                index
                element={
                  <LazyRoute sectionName="System Monitoring">
                    <MonitoringPage />
                  </LazyRoute>
                }
              />
            </Route>

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
        <ReloadPrompt />
      </div>
    </ErrorBoundary>
  )
}

export default App

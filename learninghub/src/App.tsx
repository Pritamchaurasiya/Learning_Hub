import { useEffect, useRef, Suspense, lazy, ReactNode } from 'react'
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
import { SectionErrorBoundary } from './components/SectionErrorBoundary'
import { useNotificationConnection } from './hooks/useNotificationConnection'
import ReloadPrompt from './components/ReloadPrompt'
import { AITutorContextWidget } from './components/AITutorContextWidget'
import { CodeCopyHandler } from './components/CodeCopyHandler'
import { useQueryClient } from '@tanstack/react-query'
import './index.css'

// Critical pages — eager loaded for instant navigation
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import TestsAPage from './pages/TestsAPage'

// Lazy-loaded page components
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ProblemsPage = lazy(() => import('./pages/ProblemsPage'))
const ProblemWorkspacePage = lazy(() => import('./pages/ProblemWorkspacePage'))
const TestsAHistoryPage = lazy(() => import('./pages/TestsAHistoryPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminAILabPage = lazy(() => import('./pages/AdminAILabPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ContestPage = lazy(() => import('./pages/ContestPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const LiveClassPage = lazy(() => import('./pages/LiveClassPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const DownloadsPage = lazy(() => import('./pages/DownloadsPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const DiscussionsPage = lazy(() => import('./pages/DiscussionsPage'))
const AITutorPage = lazy(() => import('./pages/AITutorPage'))
const StudyPlannerPage = lazy(() => import('./pages/StudyPlannerPage'))
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'))
const AdminABTestingPage = lazy(() => import('./pages/AdminABTestingPage'))
const AdminSecurityPage = lazy(() => import('./pages/AdminSecurityPage'))
const OfflinePage = lazy(() => import('./pages/OfflinePage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))

function ProtectedLayout() {
  const auth = useStore(state => state.auth)
  const location = useLocation()

  if (!auth.isHydrated) return <LoadingScreen fullScreen={true} />
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }
  return (
    <Layout>
      <SectionErrorBoundary sectionName="Page Content">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </SectionErrorBoundary>
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
  const queryClient = useQueryClient()
  const auth = useStore(s => s.auth)
  const theme = useStore(s => s.theme)
  const fetchMe = useStore(s => s.fetchMe)
  const logout = useStore(s => s.logout)
  const addToast = useStore(s => s.addToast)
  const location = useLocation()
  const navigate = useNavigate()
  const authVerificationStarted = useRef(false)

  useNotificationConnection()

  // The backend owns authentication through HttpOnly cookies. After Zustand
  // hydration, always verify the current browser session exactly once. This
  // prevents stale local state from granting access and also restores a valid
  // session after a full page refresh without exposing tokens to JavaScript.
  useEffect(() => {
    if (!auth.isHydrated || authVerificationStarted.current) return
    authVerificationStarted.current = true
    void fetchMe()
  }, [auth.isHydrated, fetchMe])

  useEffect(() => {
    if (!auth.isAuthenticated && auth.isHydrated) queryClient.clear()
  }, [auth.isAuthenticated, auth.isHydrated, queryClient])

  useEffect(() => {
    const handleSessionExpired = () => {
      queryClient.clear()
      void logout()
      addToast({ message: 'Session expired. Please log in again.', type: 'warning' })
      navigate('/auth', { replace: true })
    }
    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [logout, addToast, navigate, queryClient])

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookieConsent')
      if (consent === 'accepted') initializeGA4()
    } catch {
      if (import.meta.env.DEV) console.warn('[App] GA4 initialization skipped')
    }
  }, [])

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookieConsent')
      if (consent === 'accepted') trackPageView(location.pathname + location.search)
    } catch {
      // Analytics must never affect navigation.
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    if (theme.mode === 'dark') document.documentElement.classList.add('dark')
    else if (theme.mode === 'light') document.documentElement.classList.remove('dark')
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }, [theme.mode])

  return (
    <ErrorBoundary onGoHome={() => navigate('/')}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
        <ScrollRestoration />
        <Suspense fallback={<LoadingScreen fullScreen={true} />}>
          <Routes>
            <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><LazyRoute sectionName="Forgot Password"><ForgotPasswordPage /></LazyRoute></PublicRoute>} />
            <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
            <Route path="/pricing" element={<PublicRoute><LazyRoute sectionName="Pricing"><PricingPage /></LazyRoute></PublicRoute>} />
            <Route path="/offline" element={<LazyRoute sectionName="Offline"><OfflinePage /></LazyRoute>} />
            <Route path="/terms" element={<LazyRoute sectionName="Terms of Service"><TermsPage /></LazyRoute>} />
            <Route path="/privacy" element={<LazyRoute sectionName="Privacy Policy"><PrivacyPage /></LazyRoute>} />

            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/search" element={<LazyRoute sectionName="Search"><SearchPage /></LazyRoute>} />
              <Route path="/bookmarks" element={<LazyRoute sectionName="Bookmarks"><BookmarksPage /></LazyRoute>} />
              <Route path="/achievements" element={<LazyRoute sectionName="Achievements"><AchievementsPage /></LazyRoute>} />
              <Route path="/problems" element={<LazyRoute sectionName="Problems"><ProblemsPage /></LazyRoute>} />
              <Route path="/problem/:slug" element={<LazyRoute sectionName="Problem Workspace"><ProblemWorkspacePage /></LazyRoute>} />
              <Route path="/certificates" element={<Navigate to="/achievements" replace />} />
              <Route path="/quiz" element={<Navigate to="/tests-a" replace />} />
              <Route path="/quiz/:quizId" element={<Navigate to="/tests-a" replace />} />
              <Route path="/quiz-history" element={<Navigate to="/tests-a-history" replace />} />
              <Route path="/tests-a" element={<TestsAPage />} />
              <Route path="/tests-a/:testId" element={<TestsAPage />} />
              <Route path="/tests-a-history" element={<LazyRoute sectionName="Test History"><TestsAHistoryPage /></LazyRoute>} />
              <Route path="/settings" element={<LazyRoute sectionName="Settings"><SettingsPage /></LazyRoute>} />
              <Route path="/contest" element={<LazyRoute sectionName="Contest"><ContestPage /></LazyRoute>} />
              <Route path="/library" element={<LazyRoute sectionName="Library"><LibraryPage /></LazyRoute>} />
              <Route path="/live-class" element={<LazyRoute sectionName="Live Classes"><LiveClassPage /></LazyRoute>} />
              <Route path="/notifications" element={<LazyRoute sectionName="Notifications"><NotificationsPage /></LazyRoute>} />
              <Route path="/analytics" element={<LazyRoute sectionName="Analytics"><AnalyticsPage /></LazyRoute>} />
              <Route path="/downloads" element={<LazyRoute sectionName="Downloads"><DownloadsPage /></LazyRoute>} />
              <Route path="/leaderboard" element={<LazyRoute sectionName="Leaderboard"><LeaderboardPage /></LazyRoute>} />
              <Route path="/discussions" element={<LazyRoute sectionName="Discussions"><DiscussionsPage /></LazyRoute>} />
              <Route path="/ai-tutor" element={<LazyRoute sectionName="AI Tutor"><AITutorPage /></LazyRoute>} />
              <Route path="/study-planner" element={<LazyRoute sectionName="Study Planner"><StudyPlannerPage /></LazyRoute>} />
            </Route>

            <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
              <Route index element={<LazyRoute sectionName="Admin Dashboard"><AdminPage /></LazyRoute>} />
              <Route path="users" element={<LazyRoute sectionName="Admin Users"><AdminUsersPage /></LazyRoute>} />
              <Route path="ai-lab" element={<LazyRoute sectionName="AI Lab"><AdminAILabPage /></LazyRoute>} />
              <Route path="analytics" element={<LazyRoute sectionName="Admin Analytics"><AdminAnalyticsPage /></LazyRoute>} />
              <Route path="ab-testing" element={<LazyRoute sectionName="A/B Testing"><AdminABTestingPage /></LazyRoute>} />
              <Route path="security" element={<LazyRoute sectionName="Admin Security"><AdminSecurityPage /></LazyRoute>} />
            </Route>
            <Route path="/monitoring" element={<AdminRoute><Layout /></AdminRoute>}>
              <Route index element={<LazyRoute sectionName="System Monitoring"><MonitoringPage /></LazyRoute>} />
            </Route>
            <Route path="*" element={<Layout><LazyRoute sectionName="Not Found"><NotFoundPage /></LazyRoute></Layout>} />
          </Routes>
        </Suspense>
        <OnboardingWizard />
        <ToastContainer />
        <CookieConsent />
        <ReloadPrompt />
        <CodeCopyHandler />
      </div>
    </ErrorBoundary>
  )
}

export default App

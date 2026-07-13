import { lazy } from 'react'

export type ImportFunc = () => Promise<{ default: import('react').ComponentType<any> }>

export interface RouteInfo {
  path: string
  load: ImportFunc
  lazy: ReturnType<typeof lazy>
}

function route(path: string, load: ImportFunc): RouteInfo {
  return { path, load, lazy: lazy(load) }
}

const routes: Record<string, RouteInfo> = {
  search: route('/search', () => import('./pages/SearchPage')),
  bookmarks: route('/bookmarks', () => import('./pages/BookmarksPage')),
  achievements: route('/achievements', () => import('./pages/AchievementsPage')),
  problems: route('/problems', () => import('./pages/ProblemsPage')),
  problemWorkspace: route('/problem/:slug', () => import('./pages/ProblemWorkspacePage')),
  testsAHistory: route('/tests-a-history', () => import('./pages/TestsAHistoryPage')),
  settings: route('/settings', () => import('./pages/SettingsPage')),
  contest: route('/contest', () => import('./pages/ContestPage')),
  library: route('/library', () => import('./pages/LibraryPage')),
  notifications: route('/notifications', () => import('./pages/NotificationsPage')),
  analytics: route('/analytics', () => import('./pages/AnalyticsPage')),
  downloads: route('/downloads', () => import('./pages/DownloadsPage')),
  leaderboard: route('/leaderboard', () => import('./pages/LeaderboardPage')),
  discussions: route('/discussions', () => import('./pages/DiscussionsPage')),
  aiTutor: route('/ai-tutor', () => import('./pages/AITutorPage')),
  studyPlanner: route('/study-planner', () => import('./pages/StudyPlannerPage')),
  liveClass: route('/live-class', () => import('./pages/LiveClassPage')),
  pricing: route('/pricing', () => import('./pages/PricingPage')),
  forgotPassword: route('/forgot-password', () => import('./pages/ForgotPasswordPage')),
  terms: route('/terms', () => import('./pages/TermsPage')),
  privacy: route('/privacy', () => import('./pages/PrivacyPage')),
  admin: route('/admin', () => import('./pages/AdminPage')),
  adminUsers: route('/admin/users', () => import('./pages/AdminUsersPage')),
  adminAILab: route('/admin/ai-lab', () => import('./pages/AdminAILabPage')),
  adminAnalytics: route('/admin/analytics', () => import('./pages/AdminAnalyticsPage')),
  adminABTesting: route('/admin/ab-testing', () => import('./pages/AdminABTestingPage')),
  adminSecurity: route('/admin/security', () => import('./pages/AdminSecurityPage')),
  monitoring: route('/monitoring', () => import('./pages/MonitoringPage')),
  offline: route('/offline', () => import('./pages/OfflinePage')),
  notFound: route('*', () => import('./pages/NotFoundPage')),
}

const prefetched = new Set<string>()

export function prefetchRoute(path: string): boolean {
  if (prefetched.has(path)) return false
  const match = Object.values(routes).find(r => {
    const pattern = r.path.replace(/:slug|:id|:quizId|[^/]+/g, '[^/]+')
    return new RegExp(`^${pattern}$`).test(path)
  })
  if (!match) return false
  prefetched.add(path)
  void match.load()
  return true
}

export default routes

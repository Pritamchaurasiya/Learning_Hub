import { useEffect } from 'react'

/**
 * Route prefetching utility for faster navigation
 * Preloads route components on hover/focus
 */

type RouteModule = () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>

const routeModules = new Map<string, RouteModule>([
  ['/search', () => import('../pages/SearchPage')],
  ['/bookmarks', () => import('../pages/BookmarksPage')],
  ['/achievements', () => import('../pages/AchievementsPage')],
  ['/problems', () => import('../pages/ProblemsPage')],
  ['/quiz', () => import('../pages/QuizPage')],
  ['/quiz-history', () => import('../pages/QuizHistoryPage')],
  ['/tests-a-history', () => import('../pages/TestsAHistoryPage')],
  ['/settings', () => import('../pages/SettingsPage')],
  ['/contest', () => import('../pages/ContestPage')],
  ['/library', () => import('../pages/LibraryPage')],
  ['/notifications', () => import('../pages/NotificationsPage')],
  ['/analytics', () => import('../pages/AnalyticsPage')],
  ['/downloads', () => import('../pages/DownloadsPage')],
  ['/certificates', () => import('../pages/CertificatesPage')],
  ['/leaderboard', () => import('../pages/LeaderboardPage')],
  ['/discussions', () => import('../pages/DiscussionsPage')],
  ['/learning-path', () => import('../pages/LearningPathPage')],
  ['/cart', () => import('../pages/CartPage')],
  ['/mentorship', () => import('../pages/MentorshipPage')],
  ['/ai-tutor', () => import('../pages/AITutorPage')],
  ['/study-planner', () => import('../pages/StudyPlannerPage')],
  ['/monitoring', () => import('../pages/MonitoringPage')],
])

const prefetchedRoutes = new Set<string>()

export const prefetchRoute = (path: string) => {
  const moduleFn = routeModules.get(path)
  if (prefetchedRoutes.has(path) || !moduleFn) return

  prefetchedRoutes.add(path)
  moduleFn().catch(() => {
    // Silent fail - user will load on navigation
    prefetchedRoutes.delete(path)
  })
}

/**
 * Hook to prefetch a route on component mount
 */
export const usePrefetchRoute = (path: string) => {
  useEffect(() => {
    const timer = setTimeout(() => prefetchRoute(path), 100)
    return () => clearTimeout(timer)
  }, [path])
}

/**
 * Prefetch multiple routes (for dashboard/high-traffic pages)
 */
export const usePrefetchRoutes = (paths: string[]) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      paths.forEach(path => prefetchRoute(path))
    }, 500)
    return () => clearTimeout(timer)
  }, [paths])
}

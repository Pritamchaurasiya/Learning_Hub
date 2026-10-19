import type { QueryClient } from '@tanstack/react-query'
import { fetchApi } from './api'

type ComponentLoader = () => Promise<unknown>
type QueryPrefetcher = (queryClient: QueryClient) => Promise<unknown>

interface RoutePrefetchConfig {
  loadComponent: ComponentLoader
  prefetchQuery?: QueryPrefetcher
}

// Registry mapping pathnames to page chunk loaders and initial query prefetchers
const ROUTE_PREFETCH_MAP = new Map<string, RoutePrefetchConfig>(
  Object.entries({
    '/dashboard': {
      loadComponent: () => import('../pages/Dashboard'),
    },
    '/problems': {
      loadComponent: () => import('../pages/ProblemsPage'),
      prefetchQuery: async (qc: QueryClient) => {
        try {
          await qc.prefetchQuery({
            queryKey: ['problems', { page: 1, limit: 20 }],
            queryFn: () => fetchApi('/problems?page=1&limit=20'),
            staleTime: 5 * 60 * 1000,
          })
        } catch {
          // Non-blocking prefetch failure
        }
      },
    },
    '/updates': {
      loadComponent: () =>
        import('../pages/StudentUpdatesPage').then(m => ({ default: m.StudentUpdatesPage })),
      prefetchQuery: async (qc: QueryClient) => {
        try {
          await qc.prefetchQuery({
            queryKey: ['updates-feed', 'ALL', '', '', 'ALL', false],
            queryFn: () => fetchApi('/updates'),
            staleTime: 60 * 1000,
          })
        } catch {
          // Non-blocking prefetch failure
        }
      },
    },
    '/library': {
      loadComponent: () => import('../pages/LibraryPage'),
      prefetchQuery: async (qc: QueryClient) => {
        try {
          await qc.prefetchQuery({
            queryKey: ['user-library'],
            queryFn: () => fetchApi('/courses/enrolled'),
            staleTime: 5 * 60 * 1000,
          })
        } catch {
          // Non-blocking prefetch failure
        }
      },
    },
    '/tests-a': {
      loadComponent: () => import('../pages/TestsAPage'),
    },
    '/tests-a-history': {
      loadComponent: () => import('../pages/TestsAHistoryPage'),
    },
    '/search': {
      loadComponent: () => import('../pages/SearchPage'),
    },
    '/bookmarks': {
      loadComponent: () => import('../pages/BookmarksPage'),
    },
    '/achievements': {
      loadComponent: () => import('../pages/AchievementsPage'),
    },
    '/profile': {
      loadComponent: () => import('../pages/ProfilePage'),
    },
    '/settings': {
      loadComponent: () => import('../pages/SettingsPage'),
    },
    '/contest': {
      loadComponent: () => import('../pages/ContestPage'),
    },
    '/leaderboard': {
      loadComponent: () => import('../pages/LeaderboardPage'),
    },
    '/discussions': {
      loadComponent: () => import('../pages/DiscussionsPage'),
    },
    '/live-class': {
      loadComponent: () => import('../pages/LiveClassPage'),
    },
    '/notifications': {
      loadComponent: () => import('../pages/NotificationsPage'),
    },
    '/analytics': {
      loadComponent: () => import('../pages/AnalyticsPage'),
    },
    '/downloads': {
      loadComponent: () => import('../pages/DownloadsPage'),
    },
    '/ai-tutor': {
      loadComponent: () => import('../pages/AITutorPage'),
    },
    '/visualizer': {
      loadComponent: () => import('../pages/AlgorithmVisualizerPage'),
    },
    '/revision': {
      loadComponent: () => import('../pages/RevisionPage'),
    },
    '/arena': {
      loadComponent: () => import('../pages/ArenaDuelPage'),
    },
    '/interview': {
      loadComponent: () => import('../pages/InterviewSimulatorPage'),
    },
    '/resume': {
      loadComponent: () => import('../pages/ResumePortfolioPage'),
    },
    '/career': {
      loadComponent: () =>
        import('../pages/CareerOrchestratorPage').then(m => ({
          default: m.CareerOrchestratorPage,
        })),
    },
    '/study-planner': {
      loadComponent: () => import('../pages/StudyPlannerPage'),
    },
    '/pricing': {
      loadComponent: () => import('../pages/PricingPage'),
    },
    '/monitoring': {
      loadComponent: () => import('../pages/MonitoringPage'),
    },
  })
)

// Track prefetched routes to avoid redundant downloads
const prefetchedRoutes = new Set<string>()

/**
 * Prefetches the code chunk and API query for a given route.
 * Non-blocking, deduplicated, and safe to call on hover/focus.
 */
export function prefetchRoute(to: string, queryClient?: QueryClient | null): void {
  // Normalize pathname (strip query string and hash)
  const path = to.split('?')[0].split('#')[0]

  if (prefetchedRoutes.has(path)) {
    return
  }

  const config = ROUTE_PREFETCH_MAP.get(path)
  if (!config) {
    return
  }

  prefetchedRoutes.add(path)

  // 1. Prefetch the component chunk
  config.loadComponent().catch(err => {
    // If dynamic import failed, remove from set so it can retry on click
    prefetchedRoutes.delete(path)
    if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      console.warn(`[RoutePrefetch] Failed to preload chunk for ${path}:`, err)
    }
  })

  // 2. Prefetch data query if available and queryClient is provided
  if (config.prefetchQuery && queryClient) {
    config.prefetchQuery(queryClient).catch(() => {
      // Non-blocking query prefetch error
    })
  }
}

/**
 * Pre-warms high-priority routes during browser idle periods.
 */
export function idlePrefetchRoutes(routes: string[], queryClient?: QueryClient | null): void {
  if (typeof window === 'undefined') return

  const executeIdle = () => {
    routes.forEach((route, idx) => {
      // Stagger idle prefetching to avoid bandwidth spikes
      setTimeout(() => {
        prefetchRoute(route, queryClient)
      }, idx * 120)
    })
  }

  if ('requestIdleCallback' in window) {
    ;(
      window as unknown as {
        requestIdleCallback: (fn: () => void, opts?: { timeout: number }) => void
      }
    ).requestIdleCallback(executeIdle, { timeout: 3000 })
  } else {
    setTimeout(executeIdle, 1000)
  }
}

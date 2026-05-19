import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * RoutePrefetcher - Prefetches common routes on navigation
 * Improves perceived performance by loading likely next routes
 */
export function RoutePrefetcher() {
  const location = useLocation()

  useEffect(() => {
    // Prefetch common routes based on current location
    const prefetchRoutes = () => {
      const currentPath = location.pathname

      // Routes to prefetch based on current page
      const routesToPrefetch: string[] = []

      if (currentPath === '/' || currentPath === '/home') {
        // On home, prefetch library and course pages
        routesToPrefetch.push('/library', '/courses')
      } else if (currentPath.startsWith('/courses/')) {
        // On course detail, prefetch related pages
        routesToPrefetch.push('/library', '/bookmarks')
      } else if (currentPath === '/library') {
        // On library, prefetch course detail
        routesToPrefetch.push('/courses')
      }

      // Use requestIdleCallback for non-critical prefetching
      const prefetch = () => {
        routesToPrefetch.forEach(route => {
          // Create link element for prefetch
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = route
          link.as = 'document'
          document.head.appendChild(link)

          // Clean up after a delay
          setTimeout(() => {
            document.head.removeChild(link)
          }, 10000)
        })
      }

      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(prefetch, { timeout: 2000 })
      } else {
        setTimeout(prefetch, 100)
      }
    }

    prefetchRoutes()
  }, [location.pathname])

  return null
}

export default RoutePrefetcher

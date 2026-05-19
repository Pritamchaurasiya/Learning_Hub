import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollRestoration - Component that handles scroll behavior on route changes
 *
 * Features:
 * - Scrolls to top on navigation to new pages
 * - Respects reduced motion preferences
 * - Works with React Router
 *
 * Usage:
 * <ScrollRestoration />
 */
export function ScrollRestoration() {
  const { pathname, key } = useLocation()

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Scroll to top with smooth behavior (or instant for reduced motion)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [pathname, key])

  return null
}

export default ScrollRestoration

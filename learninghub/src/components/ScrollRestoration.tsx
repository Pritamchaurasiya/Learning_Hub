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
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mainEl = document.querySelector<HTMLElement>('main#main-content')
    if (mainEl) {
      mainEl.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    } else {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    }
  }, [pathname, key])

  return null
}

export default ScrollRestoration

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * useScrollRestoration - Restore scroll position on navigation
 *
 * Features:
 * - Saves scroll position when leaving page
 * - Restores when returning via back button
 * - Smooth scroll to top on new navigation
 * - Respects reduced motion preferences
 *
 * Usage:
 * const { scrollToTop } = useScrollRestoration()
 *
 * // In your component
 * useEffect(() => {
 *   scrollToTop()
 * }, [])
 */
export function useScrollRestoration() {
  const location = useLocation()
  const scrollPositions = useRef<Map<string, number>>(new Map())
  const isFirstRender = useRef(true)

  // Save scroll position before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      scrollPositions.current.set(location.pathname, window.scrollY)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [location.pathname])

  // Restore or reset scroll on route change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const savedPosition = scrollPositions.current.get(location.pathname)

    if (savedPosition !== undefined && history.state?.idx > 0) {
      // Back/forward navigation - restore position
      window.scrollTo({
        top: savedPosition,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    } else {
      // New navigation - scroll to top
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }
  }, [location.pathname, location.key])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
    }
  }

  const saveScrollPosition = (key: string) => {
    scrollPositions.current.set(key, window.scrollY)
  }

  return {
    scrollToTop,
    scrollToElement,
    saveScrollPosition,
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default useScrollRestoration

import { useRef, useCallback, useEffect, useState } from 'react'

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the element that had focus before the trap
    previousFocusRef.current = document.activeElement as HTMLElement

    const container = containerRef.current
    if (!container) return

    // Find all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus the first element
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      // Restore previous focus
      previousFocusRef.current?.focus()
    }
  }, [isActive])

  return containerRef
}

// Skip to main content link
export function useSkipLink(mainContentId: string) {
  const handleSkip = useCallback(() => {
    const mainContent = document.getElementById(mainContentId)
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1')
      mainContent.focus()
      mainContent.removeAttribute('tabindex')
    }
  }, [mainContentId])

  return handleSkip
}

// Announce changes to screen readers
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div')
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message

    document.body.appendChild(announcer)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }, [])

  return announce
}

// Keyboard navigation hook
export function useKeyboardNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  options?: {
    orientation?: 'horizontal' | 'vertical'
    loop?: boolean
  }
) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const { orientation = 'vertical', loop = true } = options ?? {}

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isHorizontal = orientation === 'horizontal'
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

      switch (e.key) {
        case nextKey:
          e.preventDefault()
          setFocusedIndex(prev => {
            const next = prev + 1
            if (next >= itemCount) {
              return loop ? 0 : prev
            }
            return next
          })
          break
        case prevKey:
          e.preventDefault()
          setFocusedIndex(prev => {
            const next = prev - 1
            if (next < 0) {
              return loop ? itemCount - 1 : prev
            }
            return next
          })
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(itemCount - 1)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onSelect(focusedIndex)
          break
      }
    },
    [focusedIndex, itemCount, onSelect, orientation, loop]
  )

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  }
}

// Reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

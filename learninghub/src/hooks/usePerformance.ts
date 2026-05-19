import { useEffect, useCallback, useRef } from 'react'

// Web Vitals monitoring
interface WebVitals {
  CLS: number // Cumulative Layout Shift
  FID: number // First Input Delay
  FCP: number // First Contentful Paint
  LCP: number // Largest Contentful Paint
  TTFB: number // Time to First Byte
}

export function usePerformanceMonitor(onVitalsCollected?: (vitals: Partial<WebVitals>) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const vitals: Partial<WebVitals> = {}

    // Largest Contentful Paint
    const observeLCP = () => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
        vitals.LCP = lastEntry.startTime
        onVitalsCollected?.({ ...vitals })
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      observer.observe({ entryTypes: ['largest-contentful-paint'] as any })
      return observer
    }

    // First Input Delay
    const observeFID = () => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          const fidEntry = entry as PerformanceEntry & {
            processingStart: number
            startTime: number
          }
          vitals.FID = fidEntry.processingStart - fidEntry.startTime
          onVitalsCollected?.({ ...vitals })
        })
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      observer.observe({ entryTypes: ['first-input'] as any })
      return observer
    }

    // Cumulative Layout Shift
    const observeCLS = () => {
      let clsValue = 0
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          const layoutShift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value
          }
        })
        vitals.CLS = clsValue
        onVitalsCollected?.({ ...vitals })
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      observer.observe({ entryTypes: ['layout-shift'] as any })
      return observer
    }

    // First Contentful Paint
    const observeFCP = () => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        const fcpEntry = entries[0] as PerformanceEntry & { startTime: number }
        if (fcpEntry) {
          vitals.FCP = fcpEntry.startTime
          onVitalsCollected?.({ ...vitals })
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      observer.observe({ entryTypes: ['paint'] as any })
      return observer
    }

    // Time to First Byte
    const getTTFB = () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      if (navigation) {
        vitals.TTFB = navigation.responseStart - navigation.startTime
        onVitalsCollected?.({ ...vitals })
      }
    }

    // Initialize observers
    const observers: PerformanceObserver[] = []

    try {
      observers.push(observeLCP())
      observers.push(observeFID())
      observers.push(observeCLS())
      observers.push(observeFCP())
      getTTFB()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.warn('Performance monitoring not supported')
    }

    return () => {
      observers.forEach(obs => obs.disconnect())
    }
  }, [onVitalsCollected])
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        callback(entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0,
        ...options,
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [callback, options])

  return elementRef
}

// Debounce function for performance
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

// Throttle function for scroll/resize events
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef(false)

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args)
        inThrottle.current = true
        setTimeout(() => {
          inThrottle.current = false
        }, limit)
      }
    },
    [callback, limit]
  )
}

// Measure component render time
export function useRenderTime(componentName: string) {
  const renderStart = useRef(performance.now())

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current
    if (renderTime > 16) {
      // Log slow renders (> 1 frame @ 60fps)
      console.warn(`[Performance] ${componentName} rendered slowly: ${renderTime.toFixed(2)}ms`)
    }
  })

  // Reset for next render
  renderStart.current = performance.now()
}

// Preload component
export function usePreload() {
  return useCallback((component: () => Promise<unknown>) => {
    // Preload the component
    const preload = () => {
      void component()
    }

    // Preload on mouse enter or focus
    return {
      onMouseEnter: preload,
      onFocus: preload,
    }
  }, [])
}

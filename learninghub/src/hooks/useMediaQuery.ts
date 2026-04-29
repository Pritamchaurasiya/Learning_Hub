import { useState, useEffect } from 'react'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

const breakpointValues: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
  '3xl': 1920
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${breakpointValues[breakpoint]}px)`)
}

export function useBreakpoints() {
  const [breakpoints, setBreakpoints] = useState<Record<Breakpoint, boolean>>({
    sm: false,
    md: false,
    lg: false,
    xl: false,
    '2xl': false,
    '3xl': false
  })

  useEffect(() => {
    const checkBreakpoints = () => {
      const newBreakpoints: Record<Breakpoint, boolean> = {} as Record<Breakpoint, boolean>
      for (const [bp, value] of Object.entries(breakpointValues)) {
        newBreakpoints[bp as Breakpoint] = window.innerWidth >= value
      }
      setBreakpoints(newBreakpoints)
    }
    checkBreakpoints()
    window.addEventListener('resize', checkBreakpoints)
    return () => window.removeEventListener('resize', checkBreakpoints)
  }, [])

  return breakpoints
}
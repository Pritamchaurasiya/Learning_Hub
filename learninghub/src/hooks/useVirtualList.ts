import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface UseVirtualListOptions<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  containerHeight?: number
}

interface UseVirtualListReturn<T> {
  virtualItems: { item: T; index: number; style: React.CSSProperties }[]
  containerRef: React.RefObject<HTMLDivElement>
  totalHeight: number
  startIndex: number
  endIndex: number
}

/**
 * useVirtualList - Virtual list hook for rendering large lists efficiently
 * Only renders items that are visible in the viewport plus overscan
 *
 * Features:
 * - Reduces DOM nodes from thousands to ~20
 * - Smooth scrolling with proper calculations
 * - Configurable overscan for smoother experience
 * - Automatic resize handling
 *
 * Usage:
 * const { virtualItems, containerRef, totalHeight } = useVirtualList({
 *   items: courses,
 *   itemHeight: 80,
 *   overscan: 5
 * })
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  containerHeight = 600,
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleHeight, setVisibleHeight] = useState(containerHeight)

  // Calculate visible range
  const { virtualItems, totalHeight, startIndex, endIndex } = useMemo(() => {
    const totalHeight = items.length * itemHeight

    // Calculate visible range with overscan
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(visibleHeight / itemHeight)
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2)

    // Generate virtual items
    const virtualItems = items.slice(startIndex, endIndex).map((item, idx) => {
      const index = startIndex + idx
      return {
        item,
        index,
        style: {
          position: 'absolute' as const,
          top: index * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      }
    })

    return { virtualItems, totalHeight, startIndex, endIndex }
  }, [items, itemHeight, scrollTop, visibleHeight, overscan])

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setVisibleHeight(containerRef.current.clientHeight)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return {
    virtualItems,
    containerRef,
    totalHeight,
    startIndex,
    endIndex,
  }
}

export default useVirtualList

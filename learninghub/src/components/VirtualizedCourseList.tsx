import React from 'react'
import { useVirtualList } from '../hooks/useVirtualList'
import type { Course } from '../types'

interface VirtualizedCourseListProps {
  courses: Course[]
  renderItem: (course: Course, index: number) => React.ReactNode
  itemHeight: number
  containerHeight?: number
}

/**
 * VirtualizedCourseList - Renders large course lists efficiently
 * Only visible items + overscan are rendered to the DOM
 *
 * Benefits:
 * - From 1000+ DOM nodes to ~20
 * - Smooth 60fps scrolling
 * - Reduced memory usage
 * - Better mobile performance
 */
export function VirtualizedCourseList({
  courses,
  renderItem,
  itemHeight,
  containerHeight = 600,
}: VirtualizedCourseListProps) {
  const { virtualItems, containerRef, totalHeight } = useVirtualList({
    items: courses,
    itemHeight,
    overscan: 3,
    containerHeight,
  })

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      className="relative"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default VirtualizedCourseList

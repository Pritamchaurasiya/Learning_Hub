import { forwardRef, useContext } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { QueryClientContext } from '@tanstack/react-query'
import { prefetchRoute } from '../utils/routePrefetchRegistry'

export interface PrefetchLinkProps extends LinkProps {
  prefetchQuery?: boolean
}

/**
 * High-performance Link replacement that predictively prefetches
 * the target page's JavaScript chunk and initial React Query data
 * on hover intent (pointerenter), mobile touch intent (touchstart),
 * and keyboard navigation (focus).
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetchQuery = true, onPointerEnter, onTouchStart, onFocus, ...props }, ref) => {
    const queryClient = useContext(QueryClientContext) ?? null

    const triggerPrefetch = () => {
      if (typeof to === 'string') {
        prefetchRoute(to, prefetchQuery ? queryClient : null)
      } else if (to && typeof to === 'object' && to.pathname) {
        prefetchRoute(to.pathname, prefetchQuery ? queryClient : null)
      }
    }

    return (
      <Link
        ref={ref}
        to={to}
        onPointerEnter={e => {
          triggerPrefetch()
          onPointerEnter?.(e)
        }}
        onTouchStart={e => {
          triggerPrefetch()
          onTouchStart?.(e)
        }}
        onFocus={e => {
          triggerPrefetch()
          onFocus?.(e)
        }}
        {...props}
      />
    )
  }
)

PrefetchLink.displayName = 'PrefetchLink'
export default PrefetchLink

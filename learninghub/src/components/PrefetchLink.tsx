import { useCallback, useRef } from 'react'
import { Link, LinkProps } from 'react-router-dom'

interface PrefetchLinkProps extends LinkProps {
  prefetchOnHover?: boolean
}

export function PrefetchLink({ prefetchOnHover = true, ...props }: PrefetchLinkProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover) return
    timerRef.current = setTimeout(() => {
      // Prefetch route by triggering a dynamic import on hover
      const path = props.to as string
      void import(
        `../pages${path === '/' ? '/HomePage' : `${path.replace(/^\//, '').replace(/\/.*/, '')}Page`}`
      ).catch(() => {})
    }, 150)
  }, [prefetchOnHover, props.to])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleMouseDown = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return (
    <Link
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseEnter}
    />
  )
}

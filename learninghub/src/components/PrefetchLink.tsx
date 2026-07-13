import { useCallback, useRef } from 'react'
import { Link, LinkProps } from 'react-router-dom'
import { prefetchRoute } from '../routeConfig'

interface PrefetchLinkProps extends LinkProps {
  prefetchOnHover?: boolean
}

export function PrefetchLink({ prefetchOnHover = true, ...props }: PrefetchLinkProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover) return
    timerRef.current = setTimeout(() => prefetchRoute(props.to as string), 150)
  }, [prefetchOnHover, props.to])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleMouseDown = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    prefetchRoute(props.to as string)
  }, [props.to])

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

import { Suspense, ReactNode } from 'react'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import { RouteProgressBar } from './ui/RouteProgressBar'

interface LazyRouteProps {
  children: ReactNode
  sectionName?: string
}

export function LazyRoute({ children, sectionName }: LazyRouteProps) {
  return (
    <SectionErrorBoundary sectionName={sectionName}>
      <Suspense fallback={<RouteProgressBar />}>{children}</Suspense>
    </SectionErrorBoundary>
  )
}

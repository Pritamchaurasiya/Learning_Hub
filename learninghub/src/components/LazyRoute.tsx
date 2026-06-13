import { Suspense, ReactNode } from 'react'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import { LoadingScreen } from './ui/LoadingScreen'

interface LazyRouteProps {
  children: ReactNode
  sectionName?: string
}

export function LazyRoute({ children, sectionName }: LazyRouteProps) {
  return (
    <SectionErrorBoundary sectionName={sectionName}>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </SectionErrorBoundary>
  )
}

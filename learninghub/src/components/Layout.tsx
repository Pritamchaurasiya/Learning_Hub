import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { NetworkStatus } from './NetworkStatus'
import ScrollToTop from './ui/ScrollToTop'
import { LoadingScreen } from './ui/LoadingScreen'
import { useStore } from '../stores/useStore'
import { ErrorBoundary } from './ErrorBoundary'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import { AnnouncerRegions } from './a11y/LiveAnnouncer'
import { Suspense, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LayoutProps {
  children?: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const lowPerformanceMode = useStore(s => s.settings?.lowPerformanceMode)
  const isLowPerformance = lowPerformanceMode ?? false
  const location = useLocation()

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-mesh relative selection:bg-primary-500/30 selection:text-primary-900 dark:selection:text-primary-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-6 focus:py-3 focus:bg-primary-600 focus:text-white focus:rounded-2xl focus:font-bold focus:shadow-2xl focus:shadow-primary-500/50 transition-all"
      >
        Skip to main content
      </a>

      {!isLowPerformance && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary-500/10 rounded-full blur-[120px] animate-pulse-subtle" />
          <div
            className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px] animate-pulse-subtle"
            style={{ animationDelay: '2s' }}
          />
        </div>
      )}

      <SectionErrorBoundary sectionName="Sidebar">
        <Sidebar />
      </SectionErrorBoundary>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <SectionErrorBoundary sectionName="Header">
          <Header />
        </SectionErrorBoundary>
        <Breadcrumb />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-6 md:py-8 lg:py-10 custom-scrollbar relative transition-all duration-300 ease-in-out"
          role="main"
          tabIndex={-1}
        >
          <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto w-full pb-[88px] lg:pb-9 transition-all duration-300">
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                {children}
                {!children &&
                  (!isLowPerformance ? (
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                      >
                        <Outlet />
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <Outlet />
                  ))}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <NetworkStatus />
      <MobileNav />
      <ScrollToTop />
      <AnnouncerRegions />
    </div>
  )
}

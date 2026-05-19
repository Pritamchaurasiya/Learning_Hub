import { ReactNode } from 'react'
import Header from './Header'
import Breadcrumb from './Breadcrumb'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { ToastContainer } from './ui/Toast'
import ScrollToTop from './ui/ScrollToTop'
import { useStore } from '../stores/useStore'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { settings } = useStore()
  const isLowPerformance = settings?.lowPerformanceMode || false

  return (
    <div className="flex h-svh overflow-hidden bg-mesh relative selection:bg-primary-500/30 selection:text-primary-900 dark:selection:text-primary-100">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-6 focus:py-3 focus:bg-primary-600 focus:text-white focus:rounded-2xl focus:font-bold focus:shadow-2xl focus:shadow-primary-500/50 transition-all"
      >
        Skip to main content
      </a>

      {/* Background decorative orbs - hidden in low performance mode */}
      {!isLowPerformance && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="orb orb-1 opacity-60 dark:opacity-40" />
          <div className="orb orb-2 opacity-60 dark:opacity-40" />
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary-500/10 rounded-full blur-[120px] animate-pulse-subtle" />
          <div
            className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px] animate-pulse-subtle"
            style={{ animationDelay: '2s' }}
          />
        </div>
      )}

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header />
        <Breadcrumb />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 custom-scrollbar relative"
          role="main"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      <MobileNav />
      <ToastContainer />
      <ScrollToTop />
    </div>
  )
}

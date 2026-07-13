import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useStore } from './stores/useStore'
import './index.css'
import * as Sentry from '@sentry/react'

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

// Rehydrate Zustand persisted state
void (async () => {
  await useStore.persist.rehydrate()
  await useStore.getState().setHydrated()
})()

// Create React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
})

// ============================================
// ERROR HANDLING: Global error monitoring
// ============================================
// In production, this would send errors to Sentry/DataDog/NewRelic
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reportErrorToMonitoring = (error: Error, context?: Record<string, any>) => {
  if (import.meta.env.PROD) {
    // Simulate Sentry integration
    console.error('[Monitoring] Error captured:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    })

    // Would send to monitoring service:
    // Sentry.captureException(error, { extra: context })
  } else {
    console.error('[Error]', error.message, context ?? '')
  }
}

// Global error handler for uncaught Promise rejections
window.addEventListener('unhandledrejection', event => {
  const reason = event.reason
  if (reason instanceof Error) {
    reportErrorToMonitoring(reason, { type: 'unhandledrejection' })
  }

  // Prevent default handling in production
  if (import.meta.env.PROD) {
    event.preventDefault()
  }
})

// Global error handler for uncaught errors
window.addEventListener('error', event => {
  if (event.error instanceof Error) {
    reportErrorToMonitoring(event.error, { type: 'error' })
  }
})

// ============================================
// REDUCED MOTION PREFERENCE
// ============================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
if (prefersReducedMotion.matches) {
  document.documentElement.classList.add('reduce-motion')
}

// ============================================
// PERFORMANCE: Optimized event listeners
// ============================================
// Note: Global event listener for copy code buttons on markdown blocks
// has been moved to the React-idiomatic CodeCopyHandler component rendered in App.tsx.

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </HelmetProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
)

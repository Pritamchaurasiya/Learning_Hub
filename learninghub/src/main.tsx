import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Create React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
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
// SECURITY: Token storage configuration
// ============================================
// Tokens are stored in localStorage with httpOnly cookie fallback
// For production, migrate to httpOnly cookies for XSS protection
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log('[Security] Token storage: localStorage (migrate to httpOnly cookies for production)')
}

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
// AUTH: Session expiry listener
// ============================================
window.addEventListener('auth:unauthorized', () => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[Auth] Session expired or invalid')
  }
  // Force page reload to clear state
  window.location.href = '/auth'
})

window.addEventListener('auth:session-expired', () => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[Auth] Session expired')
  }
  window.location.href = '/auth'
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
// Global event listener for copy code buttons on markdown blocks
document.addEventListener('click', e => {
  const target = e.target as HTMLElement
  const btn = target.closest('.copy-code-button') as HTMLButtonElement | null

  if (btn) {
    const encodedCode = btn.getAttribute('data-code')
    if (encodedCode) {
      const code = decodeURIComponent(encodedCode)
      void navigator.clipboard.writeText(code).then(() => {
        // Store original children for restoration
        const originalChildren = Array.from(btn.childNodes)

        // Clear and add success state using DOM methods (safer than innerHTML)
        btn.textContent = ''

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('class', 'w-4 h-4 text-green-500')
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        svg.setAttribute('width', '24')
        svg.setAttribute('height', '24')
        svg.setAttribute('viewBox', '0 0 24 24')
        svg.setAttribute('fill', 'none')
        svg.setAttribute('stroke', 'currentColor')
        svg.setAttribute('stroke-width', '2')
        svg.setAttribute('stroke-linecap', 'round')
        svg.setAttribute('stroke-linejoin', 'round')

        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
        polyline.setAttribute('points', '20 6 9 17 4 12')
        svg.appendChild(polyline)

        const span = document.createElement('span')
        span.className = 'text-xs font-medium mr-1 text-green-500'
        span.textContent = 'Copied!'

        btn.appendChild(svg)
        btn.appendChild(span)

        setTimeout(() => {
          btn.textContent = ''
          originalChildren.forEach(child => btn.appendChild(child))
        }, 2000)
      })
    }
  }
})

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

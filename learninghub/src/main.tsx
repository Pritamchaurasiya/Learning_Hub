import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Global error handler for uncaught Promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled Promise Rejection:', event.reason)
  // In production, report to error tracking service
  if (import.meta.env.PROD) {
    // Sentry.captureException(event.reason)
  }
})

// Global error handler foruncaught errors
window.addEventListener('error', (event) => {
  console.error('[Global] Error:', event.error)
  if (import.meta.env.PROD) {
    // Sentry.captureException(event.error)
  }
})

// Reduced motion preference for accessibility
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
if (prefersReducedMotion.matches) {
  document.documentElement.classList.add('reduce-motion')
}

// Global event listener for copy code buttons on markdown blocks
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const btn = target.closest('.copy-code-button') as HTMLButtonElement | null;
  
  if (btn) {
    const encodedCode = btn.getAttribute('data-code');
    if (encodedCode) {
      const code = decodeURIComponent(encodedCode);
      navigator.clipboard.writeText(code).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = `
          <svg class="w-4 h-4 text-green-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-xs font-medium mr-1 text-green-500">Copied!</span>
        `;
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      });
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)

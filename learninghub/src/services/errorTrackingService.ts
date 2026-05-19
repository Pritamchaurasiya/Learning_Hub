/**
 * Error Tracking Service - Sentry Integration
 * Production error monitoring with privacy compliance
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - User context tracking (privacy-safe)
 * - Breadcrumbs for debugging
 * - Environment-based configuration
 */

import React from 'react'
import type { User } from '../types/user'

// Sentry DSN from environment
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
// Sentry is configured only in production

// Check if error tracking is enabled
const isEnabled = (): boolean => {
  // Only enable in production with valid DSN
  if (import.meta.env.DEV) return false
  if (!SENTRY_DSN) return false

  // Check for user consent
  const consent = localStorage.getItem('cookieConsent')
  if (consent !== 'accepted') return false

  return true
}

// Simple error tracking interface
interface ErrorContext {
  user?: {
    id: string
    email?: string
    username?: string
  }
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

// Breadcrumb for debugging trail
interface Breadcrumb {
  category: string
  message: string
  level: 'info' | 'warning' | 'error'
  timestamp: number
  data?: Record<string, unknown>
}

class ErrorTrackingService {
  private initialized = false
  private breadcrumbs: Breadcrumb[] = []
  private maxBreadcrumbs = 100

  initialize(): void {
    if (this.initialized || !isEnabled()) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[ErrorTracking] Disabled (dev mode or no consent)')
      }
      return
    }

    // In a real implementation, you would dynamically import Sentry here
    // For now, we set up the infrastructure
    this.initialized = true

    // Global error handlers
    window.addEventListener('error', this.handleError)
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[ErrorTracking] Initialized')
    }
  }

  setUser(user: User | null): void {
    if (!this.initialized || !user) return

    // Privacy-safe user context
    const userContext = {
      id: String(user.id),
      email: user.email,
      username: user.username,
    }

    // Store for later Sentry integration
    this.userContext = userContext
  }

  private userContext: ErrorContext['user'] | null = null

  captureError(error: Error, context?: Partial<ErrorContext>): void {
    if (!this.initialized) {
      if (import.meta.env.DEV) {
        console.error('[ErrorTracking]', error, context)
      }
      return
    }

    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      breadcrumbs: [...this.breadcrumbs],
      user: this.userContext,
      tags: context?.tags,
      extra: context?.extra,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }

    // In production, send to Sentry
    if (!import.meta.env.DEV) {
      // Sentry.captureException(error, {
      //   user: errorInfo.user,
      //   tags: errorInfo.tags,
      //   extra: errorInfo.extra,
      //   breadcrumbs: errorInfo.breadcrumbs,
      // })

      // For now, log to console in structured format
      console.error('[ErrorTracking] Captured:', errorInfo)
    } else {
      console.error('[ErrorTracking]', error, context)
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.initialized) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`[ErrorTracking] ${level}:`, message)
      }
      return
    }

    if (!import.meta.env.DEV) {
      // Sentry.captureMessage(message, level)
      // eslint-disable-next-line no-console
      console.log(`[ErrorTracking] ${level}:`, message)
    }
  }

  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    const breadcrumb: Breadcrumb = {
      category,
      message,
      level: 'info',
      timestamp: Date.now(),
      data,
    }

    this.breadcrumbs.push(breadcrumb)

    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift()
    }
  }

  setTag(key: string, value: string): void {
    // Store for Sentry integration
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[ErrorTracking] Tag: ${key}=${value}`)
    }
  }

  private handleError = (event: ErrorEvent): void => {
    this.captureError(event.error, {
      tags: { type: 'global_error' },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

    this.captureError(error, {
      tags: { type: 'unhandled_rejection' },
    })
  }

  // Performance monitoring
  startTransaction(name: string, op: string): { finish: () => void } {
    const startTime = performance.now()

    return {
      finish: () => {
        const duration = performance.now() - startTime
        this.addBreadcrumb('performance', `${name} completed`, {
          operation: op,
          duration: `${duration.toFixed(2)}ms`,
        })

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
        }
      },
    }
  }
}

export const errorTrackingService = new ErrorTrackingService()

// React Error Boundary integration helper
export function withErrorTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  return function WithErrorTracking(props: P) {
    errorTrackingService.addBreadcrumb('react', `${componentName} rendered`, {
      props: Object.keys(props),
    })
    return React.createElement(WrappedComponent, props)
  }
}

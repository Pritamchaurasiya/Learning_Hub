import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      environment: process.env.NODE_ENV ?? 'development',
    })
    // Sentry initialized successfully
  } else {
    console.warn('SENTRY_DSN not provided, Sentry error tracking disabled.')
  }
}

export const sentryCaptureException = (error: Error | unknown, context?: Record<string, any>) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context })
  }
}

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
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['authorization']
          delete event.request.headers['cookie']
        }
        if (event.request?.data) {
          try {
            const bodyStr = JSON.stringify(event.request.data).toLowerCase()
            if (bodyStr.includes('password') || bodyStr.includes('token')) {
              event.request.data = '[Redacted by PII Scrubber]'
            }
          } catch {
            // Ignore stringify errors on cyclic structures
          }
        }
        return event
      },
    })
    // Sentry initialized successfully
  } else {
    console.warn('SENTRY_DSN not provided, Sentry error tracking disabled.')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sentryCaptureException = (error: Error | unknown, context?: Record<string, any>) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context })
  }
}

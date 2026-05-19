import { LogEntry, RequestContext } from '../types'

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Structured logger for Cloudflare Workers
 * Outputs JSON logs for easy parsing by log aggregators
 */
class Logger {
  private requestContext: RequestContext | null = null

  setRequestContext(context: RequestContext) {
    this.requestContext = context
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestContext?.requestId || 'system',
      message,
      context: {
        ...this.requestContext,
        ...context,
      },
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    return entry
  }

  private output(entry: LogEntry): void {
    // In production, you might want to batch these or send to a logging service
    // For now, console output is appropriate for Workers
    const output = JSON.stringify(entry)

    switch (entry.level) {
      case 'error':
        console.error(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'debug':
        console.debug(output)
        break
      default:
        console.log(output)
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.output(this.createLogEntry('info', message, context))
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.output(this.createLogEntry('warn', message, context))
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.output(this.createLogEntry('error', message, context, error))
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.output(this.createLogEntry('debug', message, context))
  }
}

// Export singleton instance
export const logger = new Logger()

/**
 * Create a request context from an incoming request
 */
export function createRequestContext(request: Request): RequestContext {
  const url = new URL(request.url)
  return {
    requestId: generateRequestId(),
    path: url.pathname,
    method: request.method,
    startTime: Date.now(),
  }
}

/**
 * Log request completion with timing
 */
export function logRequestCompletion(context: RequestContext, status: number, error?: Error): void {
  const duration = Date.now() - context.startTime

  const logData = {
    method: context.method,
    path: context.path,
    status,
    durationMs: duration,
  }

  if (error) {
    logger.error('Request failed', error, logData)
  } else if (status >= 400) {
    logger.warn('Request completed with error status', logData)
  } else {
    logger.info('Request completed', logData)
  }
}

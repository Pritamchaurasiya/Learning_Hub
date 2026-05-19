/**
 * Structured Logger Utility
 * Provides consistent logging across the application with different log levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

function getCurrentLogLevel(): number {
  return process.env.LOG_LEVEL
    ? parseInt(process.env.LOG_LEVEL)
    : process.env.NODE_ENV === 'production'
      ? LogLevel.WARN
      : LogLevel.DEBUG
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: Record<string, unknown>
  error?: Error
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    // eslint-disable-next-line security/detect-object-injection
    level: LogLevel[level],
    message,
    context,
    error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
  }
}

function shouldLog(level: LogLevel): boolean {
  return level <= getCurrentLogLevel()
}

export const logger = {
  error: (message: string, error?: Error, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.ERROR)) {
      const entry = createLogEntry(LogLevel.ERROR, message, context, error)
      console.error(JSON.stringify(entry))
    }
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.WARN)) {
      const entry = createLogEntry(LogLevel.WARN, message, context)
      console.warn(JSON.stringify(entry))
    }
  },

  info: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.INFO)) {
      const entry = createLogEntry(LogLevel.INFO, message, context)
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry))
    }
  },

  debug: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog(LogLevel.DEBUG)) {
      const entry = createLogEntry(LogLevel.DEBUG, message, context)
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(entry))
    }
  },

  // Audit logging for sensitive operations
  audit: (action: string, userId: string, details: Record<string, unknown>) => {
    const entry = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      action,
      userId,
      details,
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry))
  },
}

export default logger

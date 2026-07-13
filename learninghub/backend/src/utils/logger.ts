/* eslint-disable security/detect-non-literal-fs-filename */
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import fs from 'fs'
import path from 'path'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const getLogLevel = (): string => {
  const configuredLevel = process.env.LOG_LEVEL?.trim().toLowerCase()
  if (configuredLevel) {
    if (['error', 'warn', 'info', 'debug'].includes(configuredLevel)) {
      return configuredLevel
    }

    const numericLevel = Number.parseInt(configuredLevel, 10)
    const numericLevelMap: Record<number, string> = {
      [LogLevel.ERROR]: 'error',
      [LogLevel.WARN]: 'warn',
      [LogLevel.INFO]: 'info',
      [LogLevel.DEBUG]: 'debug',
      4: 'debug',
    }

    if (numericLevel in numericLevelMap) {
      // eslint-disable-next-line security/detect-object-injection
      return numericLevelMap[numericLevel]
    }
  }

  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const { combine, timestamp, printf, colorize, errors, json } = winston.format

// Custom format for terminal output
const consoleFormat = printf(({ level, message, timestamp, stack, context, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`
  if (context) {
    log += `\nContext: ${JSON.stringify(context, null, 2)}`
  }
  if (Object.keys(metadata).length > 0) {
    log += `\nMeta: ${JSON.stringify(metadata)}`
  }
  if (stack) {
    log += `\nStack: ${stack}`
  }
  return log
})

const winstonLogger = winston.createLogger({
  level: getLogLevel(),
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
  defaultMeta: { service: 'learninghub-backend' },
  transports: [
    // Standard application logs
    new DailyRotateFile({
      dirname: logDir,
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info', // Minimum level to write to standard log
    }),
    // Error logs separated for quick scanning
    new DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    }),
  ],
})

const auditLogger = winston.createLogger({
  level: 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), json()),
  defaultMeta: { service: 'learninghub-backend', type: 'AUDIT' },
  transports: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'audit-%DATE%.log',
      datePattern: 'YYYY-MM',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '12m', // Keep audit logs for 12 months
    }),
  ],
})

// Add console transport for local development, or when explicitly requested.
if (
  (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') ||
  process.env.LOG_TO_CONSOLE === 'true'
) {
  winstonLogger.add(
    new winston.transports.Console({
      format: combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
    })
  )
}

type AppLogLevel = 'error' | 'warn' | 'info' | 'debug'

const LOG_LEVEL_PRIORITY: Record<AppLogLevel, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
}

const isLevelEnabled = (level: AppLogLevel): boolean => {
  const configured = getLogLevel() as AppLogLevel

  // eslint-disable-next-line security/detect-object-injection
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[configured]
}

const safeStringify = (obj: unknown): string => {
  const cache = new Set()
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]'
      }
      cache.add(value)
    }
    return value
  })
}

const emitTestLog = (
  level: AppLogLevel,
  message: string,
  fields: Record<string, unknown> = {}
): void => {
  if (
    !process.env.JEST_WORKER_ID ||
    process.env.LOG_TO_CONSOLE !== 'true' ||
    !isLevelEnabled(level)
  )
    return

  const payload = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...fields,
  }
  const serialized = safeStringify(payload)

  if (level === 'error') {
    console.error(serialized)
  } else if (level === 'warn') {
    console.warn(serialized)
  } else {
    // eslint-disable-next-line no-console
    console.log(serialized)
  }
}

const emitTestAuditLog = (
  action: string,
  userId: string,
  details: Record<string, unknown>
): void => {
  if (!process.env.JEST_WORKER_ID || process.env.LOG_TO_CONSOLE !== 'true') return

  // eslint-disable-next-line no-console
  console.log(
    safeStringify({
      type: 'AUDIT',
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
    })
  )
}

export const logger = {
  error: (message: string, error?: Error, context?: Record<string, unknown>) => {
    emitTestLog('error', message, {
      error: error ? { message: error.message, stack: error.stack, name: error.name } : undefined,
      context,
    })
    winstonLogger.error(message, {
      error: error ? { message: error.message, stack: error.stack, name: error.name } : undefined,
      context,
    })
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    emitTestLog('warn', message, { context })
    winstonLogger.warn(message, { context })
  },

  info: (message: string, context?: Record<string, unknown>) => {
    emitTestLog('info', message, { context })
    winstonLogger.info(message, { context })
  },

  debug: (message: string, context?: Record<string, unknown>) => {
    emitTestLog('debug', message, { context })
    winstonLogger.debug(message, { context })
  },

  // Audit logging for sensitive operations
  audit: (action: string, userId: string, details: Record<string, unknown>) => {
    emitTestAuditLog(action, userId, details)
    auditLogger.info(action, {
      action,
      userId,
      details,
    })
  },
}

export default logger

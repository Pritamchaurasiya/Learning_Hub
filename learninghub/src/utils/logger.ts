type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  context?: string
  userId?: string
}

const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 100

  private createEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: string
  ): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    }
  }

  debug(message: string, data?: unknown, context?: string) {
    if (isDevelopment) {
      const entry = this.createEntry('debug', message, data, context)
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, data ?? '')
      this.addLog(entry)
    }
  }

  info(message: string, data?: unknown, context?: string) {
    const entry = this.createEntry('info', message, data, context)
    this.addLog(entry)
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, data ?? '')
    }
  }

  warn(message: string, data?: unknown, context?: string) {
    const entry = this.createEntry('warn', message, data, context)
    this.addLog(entry)
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data ?? '')
    }
  }

  error(message: string, error?: unknown, context?: string) {
    const entry = this.createEntry('error', message, error, context)
    this.addLog(entry)
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error ?? '')
    }
    this.reportError(entry)
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  private reportError(_entry: LogEntry) {
    if (isProduction) {
      // In production, you would send to Sentry or similar
      // Sentry?.captureException(_entry)
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = new Logger()

export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(message, data, context),
    info: (message: string, data?: unknown) => logger.info(message, data, context),
    warn: (message: string, data?: unknown) => logger.warn(message, data, context),
    error: (message: string, error?: unknown) => logger.error(message, error, context),
  }
}

const isDevelopment = import.meta.env.DEV

interface DebugConfig {
  enabled: boolean
  showTimestamp: boolean
  maxDepth: number
}

const config: DebugConfig = {
  enabled: isDevelopment,
  showTimestamp: true,
  maxDepth: 5,
}

export function createDebugLogger(context: string) {
  if (!config.enabled) {
    return {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
    }
  }

  const formatMessage = (message: string) => {
    const prefix = config.showTimestamp
      ? `[${new Date().toISOString()}] [${context}]`
      : `[${context}]`
    return `${prefix} ${message}`
  }

  return {
    log: (message: string, data?: unknown) => {
      // eslint-disable-next-line no-console
      console.log(formatMessage(message), data)
    },
    error: (message: string, error: unknown) => {
      console.error(formatMessage(message), error)
    },
    warn: (message: string, data?: unknown) => {
      console.warn(formatMessage(message), data)
    },
    info: (message: string, data?: unknown) => {
      // eslint-disable-next-line no-console
      console.info(formatMessage(message), data)
    },
    group: (label: string) => {
      // eslint-disable-next-line no-console
      console.group(formatMessage(label))
    },
    groupEnd: () => {
      // eslint-disable-next-line no-console
      console.groupEnd()
    },
    time: (label: string) => {
      // eslint-disable-next-line no-console
      console.time(formatMessage(label))
    },
    timeEnd: (label: string) => {
      // eslint-disable-next-line no-console
      console.timeEnd(formatMessage(label))
    },
  }
}

export function enableDebug() {
  config.enabled = true
}

export function disableDebug() {
  config.enabled = false
}

export function setDebugConfig(newConfig: Partial<DebugConfig>) {
  Object.assign(config, newConfig)
}

export function getDebugConfig(): DebugConfig {
  return { ...config }
}

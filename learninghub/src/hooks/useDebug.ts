import { useEffect, useRef } from 'react'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface DebugOptions {
  context?: string
  enabled?: boolean
  defaultLevel?: LogLevel
}

const isDev = import.meta.env.DEV

export function useDebug(options: DebugOptions = {}) {
  const { context = 'Debug', enabled = isDev } = options
  const contextRef = useRef(context)

  useEffect(() => {
    contextRef.current = context
  }, [context])

  const log = (...args: unknown[]) => {
    if (enabled) {
      // eslint-disable-next-line no-console
      console.debug(`[${contextRef.current}]`, ...args)
    }
  }

  const info = (...args: unknown[]) => {
    if (enabled) {
      // eslint-disable-next-line no-console
      console.info(`[${contextRef.current}]`, ...args)
    }
  }

  const warn = (...args: unknown[]) => {
    if (enabled) {
      console.warn(`[${contextRef.current}]`, ...args)
    }
  }

  const error = (...args: unknown[]) => {
    if (enabled) {
      console.error(`[${contextRef.current}]`, ...args)
    }
  }

  const group = (label: string) => {
    if (enabled) {
      // eslint-disable-next-line no-console
      console.group(`[${contextRef.current}] ${label}`)
    }
  }

  const groupEnd = () => {
    if (enabled) {
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }

  const time = (label: string) => {
    if (enabled) {
      // eslint-disable-next-line no-console
      console.time(`[${contextRef.current}] ${label}`)
    }
  }

  const timeEnd = (label: string) => {
    if (enabled) {
      // eslint-disable-next-line no-console
      console.timeEnd(`[${contextRef.current}] ${label}`)
    }
  }

  return { log, info, warn, error, group, groupEnd, time, timeEnd }
}

export function createDebugLogger(context: string, enabled: boolean = isDev) {
  return {
    // eslint-disable-next-line no-console
    debug: (...args: unknown[]) => enabled && console.debug(`[${context}]`, ...args),
    // eslint-disable-next-line no-console
    info: (...args: unknown[]) => enabled && console.info(`[${context}]`, ...args),
    warn: (...args: unknown[]) => enabled && console.warn(`[${context}]`, ...args),
    error: (...args: unknown[]) => enabled && console.error(`[${context}]`, ...args),
  }
}

import { useState, useEffect } from 'react'
import { logger } from './logger'

type NetworkStatus = 'online' | 'offline'

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : 'online'
  )

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online')
      logger.info('Network status: online')
    }

    const handleOffline = () => {
      setStatus('offline')
      logger.warn('Network status: offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return status
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

export async function waitForOnline(): Promise<void> {
  return new Promise(resolve => {
    if (navigator.onLine) {
      resolve()
      return
    }

    const handler = () => {
      resolve()
      window.removeEventListener('online', handler)
    }

    window.addEventListener('online', handler)
  })
}

interface RetryOptions {
  maxRetries?: number
  delay?: number
  backoff?: boolean
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1}`, lastError)

      if (attempt < maxRetries) {
        const waitTime = backoff ? delay * Math.pow(2, attempt) : delay
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

interface NetworkInformation {
  effectiveType?: string
}

export function getConnectionSpeed(): string {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as { connection?: NetworkInformation }).connection
    return connection?.effectiveType ?? 'unknown'
  }
  return 'unknown'
}

export function isSlowConnection(): boolean {
  const speed = getConnectionSpeed()
  return speed === 'slow-2g' || speed === '2g'
}

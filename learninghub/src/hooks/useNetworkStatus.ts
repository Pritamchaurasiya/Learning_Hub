import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
  checkConnection: () => Promise<boolean>
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      // Reset wasOffline after a delay
      setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    checkConnection,
  }
}

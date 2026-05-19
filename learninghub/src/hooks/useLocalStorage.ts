import { useState, useEffect } from 'react'

type SetValue<T> = T | ((val: T) => T)

/**
 * Secure storage hook that avoids localStorage for sensitive data
 * Uses in-memory storage for tokens to prevent XSS attacks
 * @note JWT tokens should be stored in httpOnly cookies, not localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void] {
  // Security: Don't allow storage of sensitive keys in localStorage
  const isSensitiveKey = (k: string) =>
    k.includes('token') || k.includes('auth') || k.includes('password') || k.includes('secret')

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    // Security: Block sensitive data from localStorage
    if (isSensitiveKey(key)) {
      if (import.meta.env.DEV) {
        console.warn(
          `[Security] Blocked sensitive key "${key}" from localStorage storage. Use httpOnly cookies instead.`
        )
      }
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`Error reading localStorage key "${key}":`, error)
      }
      return initialValue
    }
  })

  const setValue = (value: SetValue<T>) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)

      // Security: Block sensitive data from localStorage
      if (isSensitiveKey(key)) {
        if (import.meta.env.DEV) {
          console.warn(
            `[Security] Blocked sensitive key "${key}" from localStorage storage. Use httpOnly cookies instead.`
          )
        }
        return
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    }
  }

  useEffect(() => {
    // Security: Don't re-sync sensitive keys
    if (isSensitiveKey(key)) {
      return
    }

    try {
      const item = window.localStorage.getItem(key)
      if (item !== null) {
        setStoredValue(JSON.parse(item))
      }
    } catch {
      // Ignore parse errors and keep current state.
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch {
          // Ignore parse errors
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue]
}

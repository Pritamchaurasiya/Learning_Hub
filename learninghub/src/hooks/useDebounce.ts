import { useState, useEffect, useRef } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    const handler = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedValue(value)
      }
    }, delay)

    return () => {
      isMountedRef.current = false
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

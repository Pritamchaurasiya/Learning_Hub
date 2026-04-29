import { useRef } from 'react'

export function usePrevious<T>(value: T): T | undefined {
  const currentRef = useRef(value)
  const previousRef = useRef<T>()

  if (value !== currentRef.current) {
    previousRef.current = currentRef.current
    currentRef.current = value
  }

  return previousRef.current
}
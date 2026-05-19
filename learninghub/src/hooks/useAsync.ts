import { useState, useCallback } from 'react'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

interface AsyncCallbacks<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useAsync<T>(asyncFunction: () => Promise<T>, callbacks: AsyncCallbacks<T> = {}) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const execute = useCallback(async () => {
    setState({ data: null, isLoading: true, error: null })
    try {
      const data = await asyncFunction()
      setState({ data, isLoading: false, error: null })
      callbacks.onSuccess?.(data)
      return data
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setState({ data: null, isLoading: false, error: err })
      callbacks.onError?.(err)
      throw err
    }
  }, [asyncFunction, callbacks])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('returns stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('stored-value')
  })

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('updated-value')
    })

    expect(result.current[0]).toBe('updated-value')
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated-value'))
  })

  it('handles JSON parsing errors gracefully', () => {
    localStorage.setItem('test-key', 'invalid-json')
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('handles complex objects', () => {
    const complexValue = { name: 'John', age: 30, hobbies: ['reading'] }
    const { result } = renderHook(() => useLocalStorage('complex-key', complexValue))

    act(() => {
      result.current[1]({ ...complexValue, age: 31 })
    })

    expect(result.current[0]).toEqual({ name: 'John', age: 31, hobbies: ['reading'] })
  })
})

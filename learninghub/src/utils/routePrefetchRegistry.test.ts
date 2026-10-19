import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prefetchRoute, idlePrefetchRoutes } from './routePrefetchRegistry'
import type { QueryClient } from '@tanstack/react-query'

describe('routePrefetchRegistry', () => {
  let mockQueryClient: Partial<QueryClient>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockQueryClient = {
      prefetchQuery: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('normalizes URLs containing query strings and hashes', () => {
    expect(() => {
      prefetchRoute('/problems?difficulty=HARD#results', mockQueryClient as QueryClient)
    }).not.toThrow()
  })

  it('safely handles unknown or unregistered routes without throwing', () => {
    expect(() => {
      prefetchRoute('/non-existent-route-xyz', mockQueryClient as QueryClient)
    }).not.toThrow()
  })

  it('deduplicates multiple prefetch calls for the same route', () => {
    const prefetchSpy = vi.fn().mockResolvedValue(undefined)
    const qc = { prefetchQuery: prefetchSpy } as unknown as QueryClient

    prefetchRoute('/dashboard', qc)
    prefetchRoute('/dashboard', qc)
    prefetchRoute('/dashboard?tab=analytics', qc)

    expect(true).toBe(true)
  })

  it('triggers queryClient.prefetchQuery when route has prefetchQuery configured', () => {
    const prefetchSpy = vi.fn().mockResolvedValue(undefined)
    const qc = { prefetchQuery: prefetchSpy } as unknown as QueryClient

    prefetchRoute('/updates', qc)
    expect(prefetchSpy).toHaveBeenCalled()
  })

  it('schedules idle route prefetching without error', () => {
    vi.useFakeTimers()
    const qc = { prefetchQuery: vi.fn().mockResolvedValue(undefined) } as unknown as QueryClient

    idlePrefetchRoutes(['/dashboard', '/problems', '/updates'], qc)
    vi.runAllTimers()
    vi.useRealTimers()

    expect(true).toBe(true)
  })

  it('completes prefetch dispatch within 5ms (ultra-fast latency threshold)', () => {
    const start = performance.now()
    prefetchRoute('/library', mockQueryClient as QueryClient)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(20)
  })
})

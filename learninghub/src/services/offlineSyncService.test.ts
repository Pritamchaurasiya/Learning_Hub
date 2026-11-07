import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { offlineSyncService } from './offlineSyncService'
import * as storage from '../utils/storage'
import * as api from '../utils/api'

describe('offlineSyncService', () => {
  beforeEach(async () => {
    await storage.clear()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await storage.clear()
  })

  it('reports online status correctly', () => {
    expect(offlineSyncService.isOnline()).toBe(true)
  })

  it('subscribes and notifies listener of status and pending count', async () => {
    const listener = vi.fn()
    const unsubscribe = offlineSyncService.subscribe(listener)

    expect(typeof unsubscribe).toBe('function')
    await new Promise(r => setTimeout(r, 15))
    expect(listener).toHaveBeenCalledWith(true, 0)

    unsubscribe()
  })

  it('queues an offline action and persists it to storage', async () => {
    vi.spyOn(offlineSyncService, 'isOnline').mockReturnValue(false)

    const actionId = await offlineSyncService.queueAction(
      'TEST_SUBMIT',
      '/api/v1/tests/test-1/submit',
      { answers: { q1: 'opt-a' } }
    )

    expect(actionId).toMatch(/^sync_/)
    const count = await offlineSyncService.getPendingCount()
    expect(count).toBe(1)

    const items = await offlineSyncService.getPendingItems()
    expect(items.length).toBe(1)
    expect(items[0].endpoint).toBe('/api/v1/tests/test-1/submit')
    expect(items[0].type).toBe('TEST_SUBMIT')
  })

  it('flushes pending queue when online and removes synced items', async () => {
    // 1. Simulate queuing when offline so it doesn't auto-flush immediately
    const onlineSpy = vi.spyOn(offlineSyncService, 'isOnline').mockReturnValue(false)

    const fetchApiSpy = vi.spyOn(api, 'fetchApi').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as any)

    await offlineSyncService.queueAction('PROGRESS_UPDATE', '/api/v1/progress', { xp: 50 })
    expect(await offlineSyncService.getPendingCount()).toBe(1)

    // 2. Now simulate coming back online
    onlineSpy.mockReturnValue(true)

    const result = await offlineSyncService.flushQueue()
    expect(result.synced).toBe(1)
    expect(result.failed).toBe(0)
    expect(fetchApiSpy).toHaveBeenCalledWith(
      '/api/v1/progress',
      expect.objectContaining({ method: 'POST' })
    )

    const remainingCount = await offlineSyncService.getPendingCount()
    expect(remainingCount).toBe(0)
  })

  it('handles API errors during flush gracefully without discarding item', async () => {
    // 1. Queue offline
    const onlineSpy = vi.spyOn(offlineSyncService, 'isOnline').mockReturnValue(false)
    vi.spyOn(api, 'fetchApi').mockRejectedValue(new Error('Network server error 500'))

    await offlineSyncService.queueAction('QUESTION_ANSWER', '/api/v1/save-answer', { qId: 'q-1' })
    expect(await offlineSyncService.getPendingCount()).toBe(1)

    // 2. Now simulate online attempt with network failure
    onlineSpy.mockReturnValue(true)

    const result = await offlineSyncService.flushQueue()
    expect(result.synced).toBe(0)
    expect(result.failed).toBe(1)

    const remainingCount = await offlineSyncService.getPendingCount()
    expect(remainingCount).toBe(1)
  })
})

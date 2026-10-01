import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  offlineAssessmentManager,
  CachedOfflineBundle,
} from './OfflineAssessmentManager'

describe('OfflineAssessmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Checksum computation', () => {
    it('computes 64-character SHA-256 hex checksum when crypto.subtle is available', async () => {
      const data = JSON.stringify({ testId: 'test-123', answers: { q1: 'opt-a' } })
      const checksum = await offlineAssessmentManager.computeChecksum(data)

      expect(typeof checksum).toBe('string')
      expect(checksum.length).toBe(64)
      expect(/^[0-9a-f]{64}$/.test(checksum)).toBe(true)
    })

    it('produces different checksums for different inputs (detects tampering)', async () => {
      const original = JSON.stringify({ questionId: 'q1', answer: 'A' })
      const tampered = JSON.stringify({ questionId: 'q1', answer: 'B' })

      const hash1 = await offlineAssessmentManager.computeChecksum(original)
      const hash2 = await offlineAssessmentManager.computeChecksum(tampered)

      expect(hash1).not.toBe(hash2)
    })

    it('falls back to string hashing when crypto.subtle is unavailable', async () => {
      const originalSubtle = window.crypto?.subtle
      try {
        if (window.crypto) {
          Object.defineProperty(window.crypto, 'subtle', {
            value: undefined,
            configurable: true,
            writable: true,
          })
        }

        const checksum = await offlineAssessmentManager.computeChecksum('fallback-test-payload')
        expect(typeof checksum).toBe('string')
        expect(checksum.length).toBeGreaterThan(0)
      } finally {
        if (window.crypto && originalSubtle) {
          Object.defineProperty(window.crypto, 'subtle', {
            value: originalSubtle,
            configurable: true,
            writable: true,
          })
        }
      }
    })
  })

  describe('Non-IndexedDB environment resilience', () => {
    it('returns empty array from listOfflineBundles without crashing if indexedDB is absent', async () => {
      const originalIdb = window.indexedDB
      try {
        // @ts-expect-error - simulating browser without IndexedDB
        delete (window as Record<string, unknown>).indexedDB

        expect(offlineAssessmentManager.isSupported()).toBe(false)
        const bundles = await offlineAssessmentManager.listOfflineBundles()
        expect(bundles).toEqual([])

        const bundle = await offlineAssessmentManager.getTestBundle('test-nonexistent')
        expect(bundle).toBeNull()

        const count = await offlineAssessmentManager.getPendingSyncCount()
        expect(count).toBe(0)
      } finally {
        window.indexedDB = originalIdb
      }
    })
  })

  describe('Mocked IndexedDB Store Operations', () => {
    let mockStores: Record<string, Map<string, unknown>>
    let originalIdb: IDBFactory

    beforeEach(() => {
      mockStores = {
        test_bundles: new Map(),
        buffered_answers: new Map(),
        sync_queue: new Map(),
      }

      originalIdb = window.indexedDB

      // Construct conforming IDB mock with transaction completion
      const mockDb = {
        objectStoreNames: {
          contains: (name: string) => name in mockStores,
        },
        createObjectStore: vi.fn(),
        transaction: (_storeNames: string | string[]) => {
          const tx: {
            objectStore: (storeName: string) => {
              get: (key: string) => { result?: unknown; onsuccess: null | (() => void); onerror: null | (() => void) }
              getAll: () => { result?: unknown[]; onsuccess: null | (() => void); onerror: null | (() => void) }
              put: (val: Record<string, unknown>) => void
              delete: (key: string) => void
            }
            oncomplete: null | (() => void)
            onerror: null | (() => void)
          } = {
            objectStore: (storeName: string) => {
              const store = mockStores[storeName] || new Map()
              return {
                get: (key: string) => {
                  const req: { result?: unknown; onsuccess: null | (() => void); onerror: null | (() => void) } = {
                    result: store.get(key),
                    onsuccess: null,
                    onerror: null,
                  }
                  setTimeout(() => req.onsuccess?.(), 0)
                  return req
                },
                getAll: () => {
                  const req: { result?: unknown[]; onsuccess: null | (() => void); onerror: null | (() => void) } = {
                    result: Array.from(store.values()),
                    onsuccess: null,
                    onerror: null,
                  }
                  setTimeout(() => req.onsuccess?.(), 0)
                  return req
                },
                put: (val: Record<string, unknown>) => {
                  const key = (storeName === 'test_bundles' ? (val.testId || val.id) : (val.id || val.testId || 'default_key')) as string
                  store.set(key, val)
                  setTimeout(() => tx.oncomplete?.(), 0)
                },
                delete: (key: string) => {
                  store.delete(key)
                  setTimeout(() => tx.oncomplete?.(), 0)
                },
              }
            },
            oncomplete: null,
            onerror: null,
          }
          return tx
        },
      }

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const mockOpen = vi.fn().mockImplementation(() => {
        const req: {
          result?: typeof mockDb
          onsuccess: null | (() => void)
          onerror: null | (() => void)
          onupgradeneeded: null | ((ev: { target: { result: typeof mockDb } }) => void)
        } = {
          result: mockDb,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        }
        setTimeout(() => {
          req.onupgradeneeded?.({ target: { result: mockDb } })
          req.onsuccess?.()
        }, 0)
        return req
      })

      // Reset internal dbPromise cache and sync flag
      // @ts-expect-error accessing private dbPromise for reset
      offlineAssessmentManager.dbPromise = null
      // @ts-expect-error accessing private isSyncing for reset
      offlineAssessmentManager.isSyncing = false

      Object.defineProperty(window, 'indexedDB', {
        value: { open: mockOpen },
        configurable: true,
        writable: true,
      })

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      window.indexedDB = originalIdb
      // @ts-expect-error resetting private dbPromise
      offlineAssessmentManager.dbPromise = null
      // @ts-expect-error resetting private isSyncing
      offlineAssessmentManager.isSyncing = false
      vi.unstubAllGlobals()
    })

    it('saves and retrieves an offline test bundle', async () => {
      const bundle: CachedOfflineBundle = {
        bundleId: 'bundle-test-1',
        testId: 'test-cat-101',
        title: 'Adaptive Assessment Bundle',
        mode: 'adaptive',
        timeLimitMinutes: 60,
        passingScore: 70,
        totalMarks: 100,
        negativeMarks: 0,
        questions: [
          {
            id: 'q1',
            text: 'What is 2PL IRT difficulty parameter called?',
            type: 'SINGLE_CHOICE',
            difficulty: 0.6,
            bloomLevel: 'APPLY',
            points: 5,
            order: 1,
            options: [
              { id: 'opt-1', text: 'b parameter', order: 1 },
              { id: 'opt-2', text: 'a parameter', order: 2 },
            ],
          },
        ],
        downloadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        signature: 'hmac-sha256-signed-bundle',
      }

      await offlineAssessmentManager.saveTestBundle(bundle)
      const retrieved = await offlineAssessmentManager.getTestBundle('test-cat-101')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.testId).toBe('test-cat-101')
      expect(retrieved?.title).toBe('Adaptive Assessment Bundle')
      expect(retrieved?.questions.length).toBe(1)

      const allBundles = await offlineAssessmentManager.listOfflineBundles()
      expect(allBundles.length).toBe(1)
      expect(allBundles[0].bundleId).toBe('bundle-test-1')
    })

    it('buffers answers with monotonic timestamps', async () => {
      await offlineAssessmentManager.bufferAnswer('test-1', 'att-1', {
        questionId: 'q1',
        answer: 'opt-1',
        confidence: 'HIGH',
        timeSpentSeconds: 45,
        timestampMs: Date.now(),
      })

      const stored = mockStores['buffered_answers'].get('att-1_q1') as Record<string, unknown>
      expect(stored).toBeDefined()
      expect(stored.questionId).toBe('q1')
      expect(stored.answer).toBe('opt-1')
      expect(stored.confidence).toBe('HIGH')
      expect(stored.timeSpentSeconds).toBe(45)
    })

    it('queues offline submissions and increments pending sync count', async () => {
      const listenerSpy = vi.fn()
      const unsub = offlineAssessmentManager.onPendingCountChange(listenerSpy)

      await offlineAssessmentManager.queueOfflineSubmission({
        testId: 'test-1',
        bundleId: 'bundle-1',
        attemptId: 'att-999',
        answers: { q1: 'opt-a' },
        confidences: { q1: 'HIGH' },
        timesSpent: { q1: 30 },
        clientStartedAt: new Date().toISOString(),
        clientCompletedAt: new Date().toISOString(),
        totalElapsedSeconds: 30,
        bundleSignature: 'bundle-sig',
      })

      const pendingCount = await offlineAssessmentManager.getPendingSyncCount()
      expect(pendingCount).toBe(1)

      unsub()
    })

    it('syncPendingQueue sends queued items to backend and removes them on 200 OK', async () => {
      mockStores['sync_queue'].set('att-sync-1', {
        id: 'att-sync-1',
        testId: 'test-sync-1',
        bundleId: 'bundle-sync-1',
        attemptId: 'att-sync-1',
        answers: { q1: 'opt-1' },
        confidences: { q1: 'MEDIUM' },
        timesSpent: { q1: 20 },
        clientStartedAt: new Date().toISOString(),
        clientCompletedAt: new Date().toISOString(),
        totalElapsedSeconds: 20,
        bundleSignature: 'sig',
        checksum: 'abc123',
        status: 'PENDING',
        retryCount: 0,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await offlineAssessmentManager.syncPendingQueue()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/tests/test-sync-1/offline-sync',
        expect.objectContaining({
          method: 'POST',
        })
      )

      expect(mockStores['sync_queue'].has('att-sync-1')).toBe(false)
      vi.unstubAllGlobals()
    })
  })
})

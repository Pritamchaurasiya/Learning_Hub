/**
 * Offline Sync Service
 *
 * Manages an IndexedDB queue for offline user actions (test answer submissions,
 * progress updates, bookmarks) when offline. Automatically flushes and syncs
 * pending actions back to backend APIs when online network status is restored.
 */

import { setItem, getItem, removeItem, keys } from '../utils/storage'
import { logger } from '../utils/logger'

export interface PendingSyncItem {
  id: string
  type: 'TEST_SUBMIT' | 'PROGRESS_UPDATE' | 'BOOKMARK_TOGGLE' | 'QUESTION_ANSWER'
  endpoint: string
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
}

class OfflineSyncService {
  private syncInProgress = false
  private listeners: Array<(isOnline: boolean, pendingCount: number) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true))
      window.addEventListener('offline', () => this.handleNetworkChange(false))
    }
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  public subscribe(listener: (isOnline: boolean, pendingCount: number) => void): () => void {
    this.listeners.push(listener)
    void this.getPendingCount().then(count => listener(this.isOnline(), count))
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(pendingCount: number): void {
    const online = this.isOnline()
    this.listeners.forEach(l => l(online, pendingCount))
  }

  /**
   * Queue an action for sync when offline or network fails.
   */
  public async queueAction(
    type: PendingSyncItem['type'],
    endpoint: string,
    payload: Record<string, unknown>
  ): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const item: PendingSyncItem = {
      id,
      type,
      endpoint,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    }

    await setItem(`pending_sync_${id}`, item)
    logger.info(`[OfflineSync] Queued action ${id} (${type})`)
    const count = await this.getPendingCount()
    this.notifyListeners(count)

    // Attempt immediate sync if online
    if (this.isOnline()) {
      void this.flushQueue()
    }

    return id
  }

  /**
   * Count remaining items in pending sync queue.
   */
  public async getPendingCount(): Promise<number> {
    const allKeys = await keys()
    return allKeys.filter(k => k.startsWith('pending_sync_')).length
  }

  /**
   * Retrieve all pending sync items.
   */
  public async getPendingItems(): Promise<PendingSyncItem[]> {
    const allKeys = await keys()
    const syncKeys = allKeys.filter(k => k.startsWith('pending_sync_'))
    const items: PendingSyncItem[] = []

    for (const key of syncKeys) {
      const item = await getItem<PendingSyncItem>(key)
      if (item) items.push(item)
    }

    return items.sort((a, b) => a.createdAt - b.createdAt)
  }

  /**
   * Flush queue and post queued items to API server.
   */
  public async flushQueue(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress || !this.isOnline()) {
      return { synced: 0, failed: 0 }
    }

    this.syncInProgress = true
    let synced = 0
    let failed = 0

    try {
      const items = await this.getPendingItems()
      logger.info(`[OfflineSync] Starting flush for ${items.length} pending items`)

      for (const item of items) {
        try {
          const response = await fetch(item.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
            },
            body: JSON.stringify(item.payload),
          })

          if (response.ok || response.status === 409 /* already processed */) {
            await removeItem(`pending_sync_${item.id}`)
            synced++
            logger.info(`[OfflineSync] Synced item ${item.id} successfully`)
          } else {
            item.retryCount += 1
            if (item.retryCount > 5) {
              // Exceeded max retries, drop to prevent queue blocking
              await removeItem(`pending_sync_${item.id}`)
              logger.warn(`[OfflineSync] Dropped item ${item.id} after 5 failed retries`)
            } else {
              await setItem(`pending_sync_${item.id}`, item)
            }
            failed++
          }
        } catch (err) {
          logger.error(`[OfflineSync] Failed syncing item ${item.id}`, err)
          failed++
        }
      }
    } finally {
      this.syncInProgress = false
      const remainingCount = await this.getPendingCount()
      this.notifyListeners(remainingCount)
    }

    return { synced, failed }
  }

  private handleNetworkChange(online: boolean): void {
    logger.info(`[OfflineSync] Network status changed: online=${online}`)
    if (online) {
      void this.flushQueue()
    }
    void this.getPendingCount().then(count => this.notifyListeners(count))
  }
}

export const offlineSyncService = new OfflineSyncService()

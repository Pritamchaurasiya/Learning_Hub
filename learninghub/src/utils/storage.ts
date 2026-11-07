import { logger } from './logger'

const DB_NAME = 'learninghub-db'
const DB_VERSION = 1
const FALLBACK_PREFIX = 'lh_idb_'

interface StorageItem {
  key: string
  value: unknown
  timestamp: number
}

let db: IDBDatabase | null = null

function isIndexedDBSupported(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.indexedDB !== 'undefined' &&
      window.indexedDB !== null
    )
  } catch {
    return false
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB not supported in this runtime environment'))
      return
    }

    try {
      const idb = typeof window !== 'undefined' && window.indexedDB ? window.indexedDB : indexedDB
      const request = idb.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        logger.warn('Failed to open IndexedDB, falling back to localStorage', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        db = request.result
        resolve(db)
      }

      request.onupgradeneeded = event => {
        const database = (event.target as IDBOpenDBRequest).result
        if (!database.objectStoreNames.contains('data')) {
          database.createObjectStore('data', { keyPath: 'key' })
        }
      }
    } catch (err) {
      reject(err)
    }
  })
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  if (isIndexedDBSupported()) {
    try {
      const database = await openDatabase()
      const transaction = database.transaction(['data'], 'readwrite')
      const store = transaction.objectStore('data')

      const item: StorageItem = {
        key,
        value,
        timestamp: Date.now(),
      }

      store.put(item)
      logger.debug(`Storage set (IndexedDB): ${key}`)
      return
    } catch {
      // Fall through to localStorage fallback
    }
  }

  // Web Storage Fallback
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${FALLBACK_PREFIX}${key}`, JSON.stringify(value))
      logger.debug(`Storage set (localStorage): ${key}`)
    }
  } catch (error) {
    logger.error(`Failed to set item in fallback storage: ${key}`, error)
    throw error
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  if (isIndexedDBSupported()) {
    try {
      const database = await openDatabase()
      const transaction = database.transaction(['data'], 'readonly')
      const store = transaction.objectStore('data')
      const request = store.get(key)

      return await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const item = request.result as StorageItem | undefined
          resolve(item ? (item.value as T) : null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Fall through to localStorage fallback
    }
  }

  // Web Storage Fallback
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`${FALLBACK_PREFIX}${key}`)
      return raw ? (JSON.parse(raw) as T) : null
    }
  } catch (error) {
    logger.warn(`Failed to get item from fallback storage: ${key}`, error)
  }
  return null
}

export async function removeItem(key: string): Promise<void> {
  if (isIndexedDBSupported()) {
    try {
      const database = await openDatabase()
      const transaction = database.transaction(['data'], 'readwrite')
      const store = transaction.objectStore('data')
      store.delete(key)
      logger.debug(`Storage removed (IndexedDB): ${key}`)
      return
    } catch {
      // Fall through to localStorage fallback
    }
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${FALLBACK_PREFIX}${key}`)
      logger.debug(`Storage removed (localStorage): ${key}`)
    }
  } catch (error) {
    logger.error(`Failed to remove item: ${key}`, error)
    throw error
  }
}

export async function clear(): Promise<void> {
  if (isIndexedDBSupported()) {
    try {
      const database = await openDatabase()
      const transaction = database.transaction(['data'], 'readwrite')
      const store = transaction.objectStore('data')
      store.clear()
      logger.debug('Storage cleared (IndexedDB)')
      return
    } catch {
      // Fall through to localStorage fallback
    }
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = []
      const len = localStorage.length ?? 0
      for (let i = 0; i < len; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(FALLBACK_PREFIX)) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
      logger.debug('Storage cleared (localStorage)')
    }
  } catch (error) {
    logger.error('Failed to clear storage', error)
    throw error
  }
}

export async function keys(): Promise<string[]> {
  if (isIndexedDBSupported()) {
    try {
      const database = await openDatabase()
      const transaction = database.transaction(['data'], 'readonly')
      const store = transaction.objectStore('data')
      const request = store.getAllKeys()

      return await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result as string[])
        }
        request.onerror = () => reject(request.error)
      })
    } catch {
      // Fall through to localStorage fallback
    }
  }

  const resultKeys: string[] = []
  try {
    if (typeof localStorage !== 'undefined') {
      const len = localStorage.length ?? 0
      for (let i = 0; i < len; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(FALLBACK_PREFIX)) {
          resultKeys.push(k.slice(FALLBACK_PREFIX.length))
        }
      }
    }
  } catch {
    // Ignore scan errors
  }
  return resultKeys
}

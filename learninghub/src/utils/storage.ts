import { logger } from './logger'

const DB_NAME = 'learninghub-db'
const DB_VERSION = 1

interface StorageItem {
  key: string
  value: unknown
  timestamp: number
}

let db: IDBDatabase | null = null

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      logger.error('Failed to open IndexedDB', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains('data')) {
        database.createObjectStore('data', { keyPath: 'key' })
      }
    }
  })
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(['data'], 'readwrite')
    const store = transaction.objectStore('data')

    const item: StorageItem = {
      key,
      value,
      timestamp: Date.now()
    }

    store.put(item)
    logger.debug(`Storage set: ${key}`)
  } catch (error) {
    logger.error(`Failed to set item: ${key}`, error)
    throw error
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(['data'], 'readonly')
    const store = transaction.objectStore('data')
    const request = store.get(key)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const item = request.result as StorageItem | undefined
        resolve(item ? (item.value as T) : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    logger.error(`Failed to get item: ${key}`, error)
    return null
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(['data'], 'readwrite')
    const store = transaction.objectStore('data')
    store.delete(key)
    logger.debug(`Storage removed: ${key}`)
  } catch (error) {
    logger.error(`Failed to remove item: ${key}`, error)
    throw error
  }
}

export async function clear(): Promise<void> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(['data'], 'readwrite')
    const store = transaction.objectStore('data')
    store.clear()
    logger.debug('Storage cleared')
  } catch (error) {
    logger.error('Failed to clear storage', error)
    throw error
  }
}

export async function keys(): Promise<string[]> {
  try {
    const database = await openDatabase()
    const transaction = database.transaction(['data'], 'readonly')
    const store = transaction.objectStore('data')
    const request = store.getAllKeys()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as string[])
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    logger.error('Failed to get keys', error)
    return []
  }
}
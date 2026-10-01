/**
 * High-Performance O(1) LRU (Least Recently Used) Cache
 *
 * Implemented using a Doubly Linked List and Hash Map.
 * Provides true O(1) lookups, insertions, updates, and evictions with optional per-key TTL.
 */

class LRUNode<K, V> {
  public key: K
  public value: V
  public expiresAt: number | null
  public prev: LRUNode<K, V> | null = null
  public next: LRUNode<K, V> | null = null

  constructor(key: K, value: V, ttlMs?: number) {
    this.key = key
    this.value = value
    this.expiresAt = ttlMs ? Date.now() + ttlMs : null
  }

  public isExpired(): boolean {
    return this.expiresAt !== null && Date.now() > this.expiresAt
  }
}

export interface LRUCacheOptions {
  capacity: number
  defaultTtlMs?: number
  onEvict?: (key: unknown, value: unknown) => void
}

export class LRUCache<K, V> {
  private readonly capacity: number
  private readonly defaultTtlMs?: number
  private readonly onEvict?: (key: K, value: V) => void
  private map: Map<K, LRUNode<K, V>> = new Map()
  private head: LRUNode<K, V> // Dummy Head
  private tail: LRUNode<K, V> // Dummy Tail
  private hits = 0
  private misses = 0

  constructor(options: LRUCacheOptions | number) {
    if (typeof options === 'number') {
      this.capacity = Math.max(1, options)
    } else {
      this.capacity = Math.max(1, options.capacity)
      this.defaultTtlMs = options.defaultTtlMs
      this.onEvict = options.onEvict as (key: K, value: V) => void
    }

    // Initialize dummy head and tail
    this.head = new LRUNode<K, V>(null as unknown as K, null as unknown as V)
    this.tail = new LRUNode<K, V>(null as unknown as K, null as unknown as V)
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  /**
   * Get value by key in O(1) time complexity.
   * Moves accessed item to head (most recently used).
   */
  public get(key: K): V | undefined {
    const node = this.map.get(key)
    if (!node) {
      this.misses++
      return undefined
    }

    if (node.isExpired()) {
      this.removeNode(node)
      this.map.delete(key)
      if (this.onEvict) this.onEvict(node.key, node.value)
      this.misses++
      return undefined
    }

    this.moveToHead(node)
    this.hits++
    return node.value
  }

  /**
   * Check if key exists and is unexpired in O(1) time without updating recency.
   */
  public has(key: K): boolean {
    const node = this.map.get(key)
    if (!node) return false
    if (node.isExpired()) {
      this.removeNode(node)
      this.map.delete(key)
      if (this.onEvict) this.onEvict(node.key, node.value)
      return false
    }
    return true
  }

  /**
   * Put key-value pair in O(1) time complexity.
   * If key exists, updates value and recency.
   * If capacity exceeded, evicts least recently used item (tail).
   */
  public put(key: K, value: V, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs
    const existing = this.map.get(key)

    if (existing) {
      existing.value = value
      existing.expiresAt = effectiveTtl ? Date.now() + effectiveTtl : null
      this.moveToHead(existing)
      return
    }

    const newNode = new LRUNode<K, V>(key, value, effectiveTtl)
    this.map.set(key, newNode)
    this.addToHead(newNode)

    if (this.map.size > this.capacity) {
      const lru = this.tail.prev
      if (lru && lru !== this.head) {
        this.removeNode(lru)
        this.map.delete(lru.key)
        if (this.onEvict) {
          this.onEvict(lru.key, lru.value)
        }
      }
    }
  }

  /**
   * Delete key in O(1) time.
   */
  public delete(key: K): boolean {
    const node = this.map.get(key)
    if (!node) return false

    this.removeNode(node)
    this.map.delete(key)
    if (this.onEvict) {
      this.onEvict(node.key, node.value)
    }
    return true
  }

  /**
   * Clear all items in O(1) allocation.
   */
  public clear(): void {
    this.map.clear()
    this.head.next = this.tail
    this.tail.prev = this.head
    this.hits = 0
    this.misses = 0
  }

  public size(): number {
    return this.map.size
  }

  public getStats(): {
    size: number
    capacity: number
    hits: number
    misses: number
    hitRatio: number
  } {
    const total = this.hits + this.misses
    const hitRatio = total > 0 ? this.hits / total : 0
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRatio: Math.round(hitRatio * 1000) / 1000,
    }
  }

  /**
   * Return entries ordered from Most Recently Used to Least Recently Used.
   */
  public entries(): Array<{ key: K; value: V; expiresAt: number | null }> {
    const list: Array<{ key: K; value: V; expiresAt: number | null }> = []
    let curr = this.head.next
    while (curr && curr !== this.tail) {
      if (!curr.isExpired()) {
        list.push({ key: curr.key, value: curr.value, expiresAt: curr.expiresAt })
      }
      curr = curr.next
    }
    return list
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.prev = this.head
    node.next = this.head.next
    if (this.head.next) {
      this.head.next.prev = node
    }
    this.head.next = node
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next
    }
    if (node.next) {
      node.next.prev = node.prev
    }
    node.prev = null
    node.next = null
  }

  private moveToHead(node: LRUNode<K, V>): void {
    this.removeNode(node)
    this.addToHead(node)
  }
}

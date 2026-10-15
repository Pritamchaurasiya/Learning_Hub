import crypto from 'crypto'

export interface CacheNode {
  id: string
  name: string
  host: string
  port: number
  weight: number
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
  keysCount: number
  memoryUsedMb: number
  maxMemoryMb: number
}

export interface VirtualNode {
  hash: number
  nodeId: string
  vnodeIndex: number
}

export interface CacheItem {
  key: string
  value: string
  hash: number
  assignedNodeId: string
  replicaNodeIds: string[]
  ttlSeconds: number
  createdAt: number
  expiresAt: number
  version: number
  isStale?: boolean
}

export interface RingTopology {
  nodes: CacheNode[]
  ringSize: number // typically 2^32 - 1
  totalVnodes: number
  vnodesPerNode: number
  replicationFactor: number
  readQuorum: number
  writeQuorum: number
  standardDeviation: number
  keysCount: number
  auditDigest: string
}

export interface NodeMigrationDiff {
  action: 'ADD_NODE' | 'REMOVE_NODE'
  targetNodeId: string
  totalKeys: number
  keysMigrated: number
  migrationPercentage: number
  naiveModuloMigrationPercentage: number
  impactSummary: string
}

export interface QuorumReadResult {
  key: string
  readQuorum: number
  nodesQueried: string[]
  responses: { nodeId: string; version: number; value: string | null }[]
  resolvedValue: string | null
  resolvedVersion: number
  isConsistent: boolean
  readRepairTriggered: boolean
  readRepairNodes: string[]
  latencyMs: number
}

export interface QuorumWriteResult {
  key: string
  value: string
  writeQuorum: number
  nodesTargeted: string[]
  successfulWrites: string[]
  isSuccessful: boolean
  newVersion: number
  latencyMs: number
}

export interface StampedeSimulationResult {
  key: string
  concurrency: number
  strategy: 'NONE' | 'MUTEX_LOCK' | 'XFETCH'
  dbQueriesCount: number
  cacheHitsCount: number
  avgLatencyMs: number
  p99LatencyMs: number
  stampedePrevented: boolean
  timeSeries: { step: number; concurrentRequests: number; dbLoad: number; cacheHits: number }[]
  explanation: string
}

export interface MultiTierLookupResult {
  key: string
  l1Hit: boolean
  l2Hit: boolean
  dbHit: boolean
  tierServed: 'L1_MEMORY' | 'L2_DISTRIBUTED' | 'DATABASE'
  value: string
  latencies: {
    l1Ms: number
    l2Ms: number
    dbMs: number
    totalMs: number
  }
  evictionBroadcastSent: boolean
}

export class DistributedCacheSimulationService {
  private static instance: DistributedCacheSimulationService

  private nodes: Map<string, CacheNode> = new Map()
  private ring: VirtualNode[] = []
  private items: Map<string, CacheItem> = new Map()
  private readonly DEFAULT_VNODES_PER_NODE = 50
  private readonly RING_SIZE = 4294967296 // 2^32
  private replicationFactor = 3
  private readQuorum = 2
  private writeQuorum = 2

  // In-memory L1 cache simulation
  private l1Cache: Map<string, { value: string; expiresAt: number }> = new Map()

  private constructor() {
    this.seedDefaultTopology()
  }

  public static getInstance(): DistributedCacheSimulationService {
    if (!DistributedCacheSimulationService.instance) {
      DistributedCacheSimulationService.instance = new DistributedCacheSimulationService()
    }
    return DistributedCacheSimulationService.instance
  }

  /**
   * Fast 32-bit FNV-1a hash producing an unsigned integer in [0, 2^32 - 1]
   */
  public hashKey(key: string): number {
    let hash = 2166136261
    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0 // Unsigned 32-bit integer
  }

  private seedDefaultTopology(): void {
    this.nodes.clear()
    this.ring = []
    this.items.clear()
    this.l1Cache.clear()

    const initialNodes: Omit<CacheNode, 'keysCount' | 'memoryUsedMb'>[] = [
      { id: 'node-alpha', name: 'Cache Cluster Alpha', host: '10.0.1.10', port: 6379, weight: 1, status: 'HEALTHY', maxMemoryMb: 4096 },
      { id: 'node-beta', name: 'Cache Cluster Beta', host: '10.0.1.11', port: 6379, weight: 1, status: 'HEALTHY', maxMemoryMb: 4096 },
      { id: 'node-gamma', name: 'Cache Cluster Gamma', host: '10.0.1.12', port: 6379, weight: 1, status: 'HEALTHY', maxMemoryMb: 4096 },
      { id: 'node-delta', name: 'Cache Cluster Delta', host: '10.0.1.13', port: 6379, weight: 1, status: 'HEALTHY', maxMemoryMb: 4096 },
    ]

    for (const node of initialNodes) {
      this.nodes.set(node.id, {
        ...node,
        keysCount: 0,
        memoryUsedMb: 128,
      })
      this.addVirtualNodesFor(node.id, this.DEFAULT_VNODES_PER_NODE * node.weight)
    }

    this.ring.sort((a, b) => a.hash - b.hash)

    // Seed realistic sample items
    const sampleKeys = [
      { key: 'user:session:usr_9901', val: '{"userId":"usr_9901","role":"student","jwt":"eyJhb..."}' },
      { key: 'course:metadata:cs101', val: '{"id":"cs101","title":"Distributed Systems","seats":250}' },
      { key: 'test:attempt:att_442', val: '{"attemptId":"att_442","score":94,"percentile":98.4}' },
      { key: 'leaderboard:weekly:global', val: '{"topUsers":["usr_88","usr_99"],"generatedAt":1773000}' },
      { key: 'problem:snippet:two-sum', val: '{"difficulty":"EASY","author":"LearningHub","tags":["Array"]}' },
      { key: 'video:manifest:stream_hd', val: '{"hls":"https://cdn.learninghub.dev/stream_hd.m3u8"}' },
      { key: 'config:rate_limits:auth', val: '{"maxTokens":60,"refillRate":1.5}' },
      { key: 'recommendations:usr_9901', val: '["cs101","sys-design-201","dsa-adv"]' },
    ]

    for (const item of sampleKeys) {
      this.putItem(item.key, item.val, 3600)
    }
  }

  private addVirtualNodesFor(nodeId: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const vnodeToken = `${nodeId}:vnode:${i}`
      const hash = this.hashKey(vnodeToken)
      this.ring.push({ hash, nodeId, vnodeIndex: i })
    }
  }

  /**
   * Find clockwise successor virtual node on the consistent hashing ring
   * Binary search in O(log(totalVnodes))
   */
  public findPrimaryNodeForHash(keyHash: number): string {
    if (this.ring.length === 0) {
      throw new Error('Consistent hash ring is empty')
    }

    let low = 0
    let high = this.ring.length - 1
    let resultIdx = 0

    // Standard upper_bound search
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (this.ring[mid].hash >= keyHash) {
        resultIdx = mid
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    // Wraparound to index 0 if hash exceeds all vnodes
    if (keyHash > this.ring[this.ring.length - 1].hash) {
      resultIdx = 0
    }

    return this.ring[resultIdx].nodeId
  }

  /**
   * Find N distinct physical successor nodes for replication
   */
  public getReplicaNodes(key: string, n: number = this.replicationFactor): string[] {
    if (this.ring.length === 0) return []

    const keyHash = this.hashKey(key)
    const distinctNodes: string[] = []
    const visited = new Set<string>()

    // Binary search for starting position
    let low = 0
    let high = this.ring.length - 1
    let startIdx = 0

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (this.ring[mid].hash >= keyHash) {
        startIdx = mid
        high = mid - 1
      } else {
        low = mid + 1
      }
    }

    if (keyHash > this.ring[this.ring.length - 1].hash) {
      startIdx = 0
    }

    // Walk clockwise collecting distinct healthy physical nodes
    let curr = startIdx
    const ringLen = this.ring.length

    for (let steps = 0; steps < ringLen && distinctNodes.length < n; steps++) {
      const nodeId = this.ring[curr].nodeId
      const node = this.nodes.get(nodeId)
      if (node && node.status !== 'DOWN' && !visited.has(nodeId)) {
        visited.add(nodeId)
        distinctNodes.push(nodeId)
      }
      curr = (curr + 1) % ringLen
    }

    return distinctNodes
  }

  public putItem(key: string, value: string, ttlSeconds: number = 3600): CacheItem {
    const keyHash = this.hashKey(key)
    const primaryNodeId = this.findPrimaryNodeForHash(keyHash)
    const replicaNodeIds = this.getReplicaNodes(key, this.replicationFactor)
    const now = Date.now()

    const existing = this.items.get(key)
    const version = existing ? existing.version + 1 : 1

    const item: CacheItem = {
      key,
      value,
      hash: keyHash,
      assignedNodeId: primaryNodeId,
      replicaNodeIds,
      ttlSeconds,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      version,
    }

    this.items.set(key, item)
    this.recalculateNodeStats()
    return item
  }

  public getItem(key: string): CacheItem | null {
    const item = this.items.get(key)
    if (!item) return null
    if (Date.now() > item.expiresAt) {
      return { ...item, isStale: true }
    }
    return item
  }

  public addNode(node: Omit<CacheNode, 'keysCount' | 'memoryUsedMb'>, vnodesPerNode: number = this.DEFAULT_VNODES_PER_NODE): NodeMigrationDiff {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node ${node.id} already exists in the cluster`)
    }

    // Pre-calculate key ownership before adding
    const preAddOwnership = new Map<string, string>()
    for (const [k] of this.items.entries()) {
      preAddOwnership.set(k, this.findPrimaryNodeForHash(this.hashKey(k)))
    }

    // Add node and its virtual nodes
    this.nodes.set(node.id, {
      ...node,
      keysCount: 0,
      memoryUsedMb: 64,
    })
    this.addVirtualNodesFor(node.id, vnodesPerNode * node.weight)
    this.ring.sort((a, b) => a.hash - b.hash)

    // Calculate migration impact
    let keysMigrated = 0
    const totalKeys = this.items.size

    for (const [k, oldNode] of preAddOwnership.entries()) {
      const newNode = this.findPrimaryNodeForHash(this.hashKey(k))
      if (newNode !== oldNode) {
        keysMigrated++
        const item = this.items.get(k)
        if (item) {
          item.assignedNodeId = newNode
          item.replicaNodeIds = this.getReplicaNodes(k, this.replicationFactor)
        }
      }
    }

    this.recalculateNodeStats()

    const migrationPercentage = totalKeys > 0 ? (keysMigrated / totalKeys) * 100 : 0
    // In naive modulo hashing, adding 1 node moves ~ N/(N+1) = ~80-90% of keys
    const n = this.nodes.size
    const naiveModuloMigrationPercentage = totalKeys > 0 ? ((n - 1) / n) * 100 : 0

    return {
      action: 'ADD_NODE',
      targetNodeId: node.id,
      totalKeys,
      keysMigrated,
      migrationPercentage: Number(migrationPercentage.toFixed(2)),
      naiveModuloMigrationPercentage: Number(naiveModuloMigrationPercentage.toFixed(2)),
      impactSummary: `Added node ${node.name}. Consistent hashing moved only ${migrationPercentage.toFixed(1)}% of keys (theoretical 1/N = ${(100 / n).toFixed(1)}%), while naive modulo would invalidate ${naiveModuloMigrationPercentage.toFixed(1)}% of all cache entries.`,
    }
  }

  public removeNode(nodeId: string): NodeMigrationDiff {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} does not exist`)
    }
    if (this.nodes.size <= 1) {
      throw new Error('Cannot remove the last node in cluster')
    }

    const preRemoveOwnership = new Map<string, string>()
    for (const [k] of this.items.entries()) {
      preRemoveOwnership.set(k, this.findPrimaryNodeForHash(this.hashKey(k)))
    }

    // Remove node and its vnodes
    this.nodes.delete(nodeId)
    this.ring = this.ring.filter(vn => vn.nodeId !== nodeId)

    let keysMigrated = 0
    const totalKeys = this.items.size

    for (const [k, oldNode] of preRemoveOwnership.entries()) {
      const newNode = this.findPrimaryNodeForHash(this.hashKey(k))
      if (newNode !== oldNode) {
        keysMigrated++
        const item = this.items.get(k)
        if (item) {
          item.assignedNodeId = newNode
          item.replicaNodeIds = this.getReplicaNodes(k, this.replicationFactor)
        }
      }
    }

    this.recalculateNodeStats()

    const migrationPercentage = totalKeys > 0 ? (keysMigrated / totalKeys) * 100 : 0
    const n = this.nodes.size
    const naiveModuloMigrationPercentage = totalKeys > 0 ? (n / (n + 1)) * 100 : 0

    return {
      action: 'REMOVE_NODE',
      targetNodeId: nodeId,
      totalKeys,
      keysMigrated,
      migrationPercentage: Number(migrationPercentage.toFixed(2)),
      naiveModuloMigrationPercentage: Number(naiveModuloMigrationPercentage.toFixed(2)),
      impactSummary: `Removed node ${nodeId}. Seamlessly redistributed ${migrationPercentage.toFixed(1)}% of keys across remaining cluster members with zero downtime.`,
    }
  }

  public setNodeStatus(nodeId: string, status: 'HEALTHY' | 'DEGRADED' | 'DOWN'): CacheNode {
    const node = this.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)
    node.status = status
    this.recalculateNodeStats()
    return node
  }

  /**
   * Quorum Read: Read from R replicas, detect discrepancies, and trigger Read Repair if required
   */
  public executeQuorumRead(key: string, customReadQuorum?: number): QuorumReadResult {
    const item = this.getItem(key)
    const replicas = this.getReplicaNodes(key, this.replicationFactor)
    const rQuorum = customReadQuorum ?? this.readQuorum

    const responses: { nodeId: string; version: number; value: string | null }[] = []
    let highestVersion = -1
    let resolvedValue: string | null = null
    const readRepairNodes: string[] = []

    // Simulate reads across replicas
    for (let i = 0; i < replicas.length && responses.length < rQuorum; i++) {
      const nId = replicas[i]
      const node = this.nodes.get(nId)
      if (node && node.status !== 'DOWN') {
        // Intentionally simulate a 1-behind stale version on degraded nodes or random 15% lag
        const isStaleSimulated = node.status === 'DEGRADED'
        const currentVersion = item ? (isStaleSimulated && item.version > 1 ? item.version - 1 : item.version) : 0
        const val = item ? item.value : null

        responses.push({
          nodeId: nId,
          version: currentVersion,
          value: val,
        })

        if (currentVersion > highestVersion) {
          highestVersion = currentVersion
          resolvedValue = val
        }
      }
    }

    // Detect if any replica responded with an outdated version
    let isConsistent = true
    for (const resp of responses) {
      if (resp.version < highestVersion) {
        isConsistent = false
        readRepairNodes.push(resp.nodeId)
      }
    }

    const readRepairTriggered = readRepairNodes.length > 0
    const latencyMs = Math.round(1.5 + responses.length * 0.8 + (readRepairTriggered ? 4.2 : 0))

    return {
      key,
      readQuorum: rQuorum,
      nodesQueried: responses.map(r => r.nodeId),
      responses,
      resolvedValue,
      resolvedVersion: highestVersion,
      isConsistent,
      readRepairTriggered,
      readRepairNodes,
      latencyMs,
    }
  }

  /**
   * Quorum Write: Write to W replicas, increment version number
   */
  public executeQuorumWrite(key: string, value: string, customWriteQuorum?: number): QuorumWriteResult {
    const replicas = this.getReplicaNodes(key, this.replicationFactor)
    const wQuorum = customWriteQuorum ?? this.writeQuorum
    const successfulWrites: string[] = []

    const existing = this.items.get(key)
    const newVersion = existing ? existing.version + 1 : 1

    for (const nId of replicas) {
      const node = this.nodes.get(nId)
      if (node && node.status !== 'DOWN') {
        successfulWrites.push(nId)
      }
    }

    const isSuccessful = successfulWrites.length >= wQuorum
    if (isSuccessful) {
      this.putItem(key, value, 3600)
    }

    return {
      key,
      value,
      writeQuorum: wQuorum,
      nodesTargeted: replicas,
      successfulWrites,
      isSuccessful,
      newVersion: isSuccessful ? newVersion : (existing ? existing.version : 0),
      latencyMs: Math.round(2.0 + successfulWrites.length * 1.2),
    }
  }

  /**
   * Cache Stampede / Thundering Herd Simulation
   * Tests Unprotected vs Distributed Mutex Lock vs Probabilistic Early Expiration (XFetch)
   */
  public simulateStampede(key: string, concurrency: number = 250, strategy: 'NONE' | 'MUTEX_LOCK' | 'XFETCH' = 'MUTEX_LOCK'): StampedeSimulationResult {
    const item = this.items.get(key)
    const timeSeries: { step: number; concurrentRequests: number; dbLoad: number; cacheHits: number }[] = []

    let dbQueriesCount = 0
    let cacheHitsCount = 0
    let avgLatencyMs = 0
    let p99LatencyMs = 0
    let stampedePrevented = false
    let explanation = ''

    const totalSteps = 5
    const batchSize = Math.floor(concurrency / totalSteps)

    if (strategy === 'NONE') {
      // Unprotected: Every single concurrent request misses and hits the database simultaneously
      dbQueriesCount = concurrency
      cacheHitsCount = 0
      avgLatencyMs = 120.5
      p99LatencyMs = 380.0
      stampedePrevented = false
      explanation = `CRITICAL THUNDERING HERD: Key expired. All ${concurrency} concurrent client requests missed cache simultaneously and bombarded the primary database, causing database CPU saturation and connection exhaustion.`

      for (let s = 1; s <= totalSteps; s++) {
        timeSeries.push({
          step: s,
          concurrentRequests: s * batchSize,
          dbLoad: s * batchSize,
          cacheHits: 0,
        })
      }
    } else if (strategy === 'MUTEX_LOCK') {
      // Single-flight Mutex: 1 request acquires lock to compute/fetch, others wait or read stale
      dbQueriesCount = 1
      cacheHitsCount = concurrency - 1
      avgLatencyMs = 8.2
      p99LatencyMs = 18.5
      stampedePrevented = true
      explanation = `MUTEX LEASE PROTECTED: First requesting worker acquired distributed lease 'lock:${key}' with 500ms TTL. Remaining ${concurrency - 1} requests awaited the mutex or served stale value without overwhelming the backend.`

      for (let s = 1; s <= totalSteps; s++) {
        timeSeries.push({
          step: s,
          concurrentRequests: s * batchSize,
          dbLoad: s === 1 ? 1 : 0,
          cacheHits: s === 1 ? batchSize - 1 : batchSize,
        })
      }
    } else {
      // XFetch: Probabilistic early refresh algorithm (Vattani, Chierichetti, Lowenstein)
      // delta * beta * -ln(rand()) > ttl_remaining
      dbQueriesCount = 1
      cacheHitsCount = concurrency
      avgLatencyMs = 2.1
      p99LatencyMs = 5.0
      stampedePrevented = true
      explanation = `PROBABILISTIC XFETCH OPTIMIZED: Background worker preemptively refreshed key ${key} using formula (delta * beta * -ln(rand()) > TTL_remaining) before physical TTL expiration. Cache hit rate remained 100% with zero user wait time.`

      for (let s = 1; s <= totalSteps; s++) {
        timeSeries.push({
          step: s,
          concurrentRequests: s * batchSize,
          dbLoad: s === 2 ? 1 : 0,
          cacheHits: s * batchSize,
        })
      }
    }

    // Refresh item if not existing
    if (!item) {
      this.putItem(key, '{"cached":true,"recomputedAt":' + Date.now() + '}')
    }

    return {
      key,
      concurrency,
      strategy,
      dbQueriesCount,
      cacheHitsCount,
      avgLatencyMs,
      p99LatencyMs,
      stampedePrevented,
      timeSeries,
      explanation,
    }
  }

  /**
   * Multi-Tier Cache Hierarchy (L1 In-Memory + L2 Distributed + Database)
   */
  public simulateMultiTierAccess(key: string): MultiTierLookupResult {
    const l1Entry = this.l1Cache.get(key)
    const now = Date.now()

    // 1. Check L1 Memory Cache (latency ~0.1ms)
    if (l1Entry && now < l1Entry.expiresAt) {
      return {
        key,
        l1Hit: true,
        l2Hit: false,
        dbHit: false,
        tierServed: 'L1_MEMORY',
        value: l1Entry.value,
        latencies: { l1Ms: 0.1, l2Ms: 0, dbMs: 0, totalMs: 0.1 },
        evictionBroadcastSent: false,
      }
    }

    // 2. Check L2 Distributed Cache (latency ~2.4ms)
    const l2Item = this.getItem(key)
    if (l2Item && !l2Item.isStale) {
      // Populate L1 cache for subsequent local requests
      this.l1Cache.set(key, { value: l2Item.value, expiresAt: now + 60_000 })
      return {
        key,
        l1Hit: false,
        l2Hit: true,
        dbHit: false,
        tierServed: 'L2_DISTRIBUTED',
        value: l2Item.value,
        latencies: { l1Ms: 0.1, l2Ms: 2.4, dbMs: 0, totalMs: 2.5 },
        evictionBroadcastSent: false,
      }
    }

    // 3. Database Fallback (latency ~45ms)
    const dbValue = `{"id":"${key}","source":"PostgreSQL_Primary","readAt":${now}}`
    // Populate both L2 and L1 via Cache-Aside
    this.putItem(key, dbValue, 3600)
    this.l1Cache.set(key, { value: dbValue, expiresAt: now + 60_000 })

    return {
      key,
      l1Hit: false,
      l2Hit: false,
      dbHit: true,
      tierServed: 'DATABASE',
      value: dbValue,
      latencies: { l1Ms: 0.1, l2Ms: 2.4, dbMs: 45.0, totalMs: 47.5 },
      evictionBroadcastSent: true,
    }
  }

  public getRingTopology(): RingTopology {
    const nodesList = Array.from(this.nodes.values())
    const keysCount = this.items.size

    // Calculate distribution standard deviation
    let variance = 0
    if (nodesList.length > 0) {
      const avgKeys = keysCount / nodesList.length
      const sqDiffs = nodesList.map(n => Math.pow(n.keysCount - avgKeys, 2))
      variance = sqDiffs.reduce((a, b) => a + b, 0) / nodesList.length
    }
    const standardDeviation = Math.sqrt(variance)

    const payload = JSON.stringify({
      nodes: nodesList.map(n => ({ id: n.id, status: n.status, keys: n.keysCount })),
      ringLen: this.ring.length,
      keysCount,
    })
    const auditDigest = crypto.createHash('sha256').update(payload).digest('hex')

    return {
      nodes: nodesList,
      ringSize: this.RING_SIZE,
      totalVnodes: this.ring.length,
      vnodesPerNode: this.DEFAULT_VNODES_PER_NODE,
      replicationFactor: this.replicationFactor,
      readQuorum: this.readQuorum,
      writeQuorum: this.writeQuorum,
      standardDeviation: Number(standardDeviation.toFixed(2)),
      keysCount,
      auditDigest,
    }
  }

  public getRingTokens(limit: number = 300): VirtualNode[] {
    return this.ring.slice(0, limit)
  }

  public getAllItems(): CacheItem[] {
    return Array.from(this.items.values())
  }

  public updateQuorumConfig(replicationFactor: number, readQuorum: number, writeQuorum: number): void {
    if (readQuorum + writeQuorum <= replicationFactor) {
      // Allowed in simulation for weak consistency demo, but noted
    }
    this.replicationFactor = Math.max(1, replicationFactor)
    this.readQuorum = Math.max(1, readQuorum)
    this.writeQuorum = Math.max(1, writeQuorum)
  }

  public resetToDefault(): void {
    this.seedDefaultTopology()
  }

  private recalculateNodeStats(): void {
    // Reset keys count
    for (const node of this.nodes.values()) {
      node.keysCount = 0
    }
    for (const item of this.items.values()) {
      const node = this.nodes.get(item.assignedNodeId)
      if (node) {
        node.keysCount++
        node.memoryUsedMb = Math.min(node.maxMemoryMb, 64 + node.keysCount * 8)
      }
    }
  }
}

export const distributedCacheSimulationService = DistributedCacheSimulationService.getInstance()

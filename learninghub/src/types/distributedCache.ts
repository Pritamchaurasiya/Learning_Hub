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
  ringSize: number
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

export interface StampedeTimeSeriesPoint {
  step: number
  concurrentRequests: number
  dbLoad: number
  cacheHits: number
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
  timeSeries: StampedeTimeSeriesPoint[]
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

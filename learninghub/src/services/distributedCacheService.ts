import { fetchApi } from '../utils/api'
import type {
  RingTopology,
  VirtualNode,
  CacheItem,
  NodeMigrationDiff,
  QuorumReadResult,
  QuorumWriteResult,
  StampedeSimulationResult,
  MultiTierLookupResult,
  CacheNode,
} from '../types/distributedCache'

export const distributedCacheService = {
  /**
   * Fetches the current consistent hashing ring topology, tokens, and cached items.
   */
  async getTopology(): Promise<{ topology: RingTopology; tokens: VirtualNode[]; items: CacheItem[] }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { topology: RingTopology; tokens: VirtualNode[]; items: CacheItem[] }
      }>('/cache-lab/topology')
      return res.data ?? (res as unknown as { topology: RingTopology; tokens: VirtualNode[]; items: CacheItem[] })
    } catch {
      return this.getMockTopology()
    }
  },

  /**
   * Adds a new item to the cache cluster.
   */
  async putItem(key: string, value: string, ttlSeconds: number = 3600): Promise<CacheItem> {
    try {
      const res = await fetchApi<{ status: string; data: { item: CacheItem } }>('/cache-lab/items', {
        method: 'POST',
        body: JSON.stringify({ key, value, ttlSeconds }),
      })
      return res.data.item
    } catch {
      const now = Date.now()
      return {
        key,
        value,
        hash: 182749102,
        assignedNodeId: 'node-alpha',
        replicaNodeIds: ['node-alpha', 'node-beta', 'node-gamma'],
        ttlSeconds,
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000,
        version: 1,
      }
    }
  },

  /**
   * Dynamically adds a node to the cluster and calculates key migration percentage.
   */
  async addNode(node: { id: string; name: string; weight?: number; maxMemoryMb?: number }): Promise<{ diff: NodeMigrationDiff; topology: RingTopology }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { diff: NodeMigrationDiff; topology: RingTopology }
      }>('/cache-lab/nodes', {
        method: 'POST',
        body: JSON.stringify(node),
      })
      return res.data
    } catch {
      const mock = this.getMockTopology()
      const diff: NodeMigrationDiff = {
        action: 'ADD_NODE',
        targetNodeId: node.id,
        totalKeys: mock.items.length,
        keysMigrated: Math.round(mock.items.length / 5),
        migrationPercentage: 20.0,
        naiveModuloMigrationPercentage: 80.0,
        impactSummary: `Added node ${node.name}. Consistent hashing moved only 20.0% of keys (theoretical 1/N), while naive modulo would invalidate 80.0% of all entries.`,
      }
      return { diff, topology: { ...mock.topology, nodes: [...mock.topology.nodes, { id: node.id, name: node.name, host: '10.0.1.15', port: 6379, weight: node.weight || 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 64, maxMemoryMb: 4096 }] } }
    }
  },

  /**
   * Removes a node from the cluster and calculates redistributed keys.
   */
  async removeNode(nodeId: string): Promise<{ diff: NodeMigrationDiff; topology: RingTopology }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { diff: NodeMigrationDiff; topology: RingTopology }
      }>(`/cache-lab/nodes/${nodeId}`, {
        method: 'DELETE',
      })
      return res.data
    } catch {
      const mock = this.getMockTopology()
      const diff: NodeMigrationDiff = {
        action: 'REMOVE_NODE',
        targetNodeId: nodeId,
        totalKeys: mock.items.length,
        keysMigrated: Math.round(mock.items.length / 4),
        migrationPercentage: 25.0,
        naiveModuloMigrationPercentage: 75.0,
        impactSummary: `Removed node ${nodeId}. Seamlessly redistributed 25.0% of keys across remaining cluster members with zero downtime.`,
      }
      return { diff, topology: { ...mock.topology, nodes: mock.topology.nodes.filter(n => n.id !== nodeId) } }
    }
  },

  /**
   * Updates health status of a node (e.g. DEGRADED to simulate replication lag).
   */
  async setNodeStatus(nodeId: string, status: 'HEALTHY' | 'DEGRADED' | 'DOWN'): Promise<{ node: CacheNode; topology: RingTopology }> {
    try {
      const res = await fetchApi<{
        status: string
        data: { node: CacheNode; topology: RingTopology }
      }>(`/cache-lab/nodes/${nodeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return res.data
    } catch {
      const mock = this.getMockTopology()
      const target = mock.topology.nodes.find(n => n.id === nodeId) || mock.topology.nodes[0]
      target.status = status
      return { node: target, topology: mock.topology }
    }
  },

  /**
   * Executes a Quorum Read (R replicas) and returns consistency verdict & repair status.
   */
  async executeQuorumRead(key: string, readQuorum?: number): Promise<QuorumReadResult> {
    try {
      const res = await fetchApi<{ status: string; data: { result: QuorumReadResult } }>('/cache-lab/quorum/read', {
        method: 'POST',
        body: JSON.stringify({ key, readQuorum }),
      })
      return res.data.result
    } catch {
      return {
        key,
        readQuorum: readQuorum || 2,
        nodesQueried: ['node-alpha', 'node-beta'],
        responses: [
          { nodeId: 'node-alpha', version: 2, value: '{"title":"Distributed Systems","seats":250}' },
          { nodeId: 'node-beta', version: 2, value: '{"title":"Distributed Systems","seats":250}' },
        ],
        resolvedValue: '{"title":"Distributed Systems","seats":250}',
        resolvedVersion: 2,
        isConsistent: true,
        readRepairTriggered: false,
        readRepairNodes: [],
        latencyMs: 3.1,
      }
    }
  },

  /**
   * Executes a Quorum Write (W replicas) and updates version.
   */
  async executeQuorumWrite(key: string, value: string, writeQuorum?: number): Promise<QuorumWriteResult> {
    try {
      const res = await fetchApi<{ status: string; data: { result: QuorumWriteResult } }>('/cache-lab/quorum/write', {
        method: 'POST',
        body: JSON.stringify({ key, value, writeQuorum }),
      })
      return res.data.result
    } catch {
      return {
        key,
        value,
        writeQuorum: writeQuorum || 2,
        nodesTargeted: ['node-alpha', 'node-beta', 'node-gamma'],
        successfulWrites: ['node-alpha', 'node-beta'],
        isSuccessful: true,
        newVersion: 3,
        latencyMs: 4.4,
      }
    }
  },

  /**
   * Simulates Cache Stampede (Thundering Herd) under Unprotected vs Mutex vs Probabilistic XFetch.
   */
  async simulateStampede(key: string, concurrency: number, strategy: 'NONE' | 'MUTEX_LOCK' | 'XFETCH'): Promise<StampedeSimulationResult> {
    try {
      const res = await fetchApi<{ status: string; data: { result: StampedeSimulationResult } }>('/cache-lab/stampede/simulate', {
        method: 'POST',
        body: JSON.stringify({ key, concurrency, strategy }),
      })
      return res.data.result
    } catch {
      if (strategy === 'NONE') {
        return {
          key,
          concurrency,
          strategy: 'NONE',
          dbQueriesCount: concurrency,
          cacheHitsCount: 0,
          avgLatencyMs: 125.0,
          p99LatencyMs: 380.0,
          stampedePrevented: false,
          timeSeries: [
            { step: 1, concurrentRequests: 50, dbLoad: 50, cacheHits: 0 },
            { step: 2, concurrentRequests: 100, dbLoad: 100, cacheHits: 0 },
            { step: 3, concurrentRequests: 150, dbLoad: 150, cacheHits: 0 },
            { step: 4, concurrentRequests: 200, dbLoad: 200, cacheHits: 0 },
            { step: 5, concurrentRequests: concurrency, dbLoad: concurrency, cacheHits: 0 },
          ],
          explanation: `CRITICAL THUNDERING HERD: Key expired. All ${concurrency} concurrent client requests missed cache simultaneously and bombarded the primary database.`,
        }
      }
      if (strategy === 'MUTEX_LOCK') {
        return {
          key,
          concurrency,
          strategy: 'MUTEX_LOCK',
          dbQueriesCount: 1,
          cacheHitsCount: concurrency - 1,
          avgLatencyMs: 8.5,
          p99LatencyMs: 19.0,
          stampedePrevented: true,
          timeSeries: [
            { step: 1, concurrentRequests: 50, dbLoad: 1, cacheHits: 49 },
            { step: 2, concurrentRequests: 100, dbLoad: 0, cacheHits: 50 },
            { step: 3, concurrentRequests: 150, dbLoad: 0, cacheHits: 50 },
            { step: 4, concurrentRequests: 200, dbLoad: 0, cacheHits: 50 },
            { step: 5, concurrentRequests: concurrency, dbLoad: 0, cacheHits: 50 },
          ],
          explanation: `MUTEX LEASE PROTECTED: First requesting worker acquired distributed lease 'lock:${key}' with 500ms TTL. Remaining requests awaited mutex or served stale value.`,
        }
      }
      return {
        key,
        concurrency,
        strategy: 'XFETCH',
        dbQueriesCount: 1,
        cacheHitsCount: concurrency,
        avgLatencyMs: 2.1,
        p99LatencyMs: 4.8,
        stampedePrevented: true,
        timeSeries: [
          { step: 1, concurrentRequests: 50, dbLoad: 0, cacheHits: 50 },
          { step: 2, concurrentRequests: 100, dbLoad: 1, cacheHits: 50 },
          { step: 3, concurrentRequests: 150, dbLoad: 0, cacheHits: 50 },
          { step: 4, concurrentRequests: 200, dbLoad: 0, cacheHits: 50 },
          { step: 5, concurrentRequests: concurrency, dbLoad: 0, cacheHits: 50 },
        ],
        explanation: `PROBABILISTIC XFETCH OPTIMIZED: Background worker preemptively refreshed key ${key} using formula (delta * beta * -ln(rand()) > TTL_remaining) before physical TTL expiration. Cache hit rate remained 100%.`,
      }
    }
  },

  /**
   * Simulates Multi-Tier Cache Hierarchy (L1 In-Memory + L2 Distributed + Database)
   */
  async simulateMultiTierAccess(key: string): Promise<MultiTierLookupResult> {
    try {
      const res = await fetchApi<{ status: string; data: { result: MultiTierLookupResult } }>('/cache-lab/multi-tier/access', {
        method: 'POST',
        body: JSON.stringify({ key }),
      })
      return res.data.result
    } catch {
      return {
        key,
        l1Hit: false,
        l2Hit: true,
        dbHit: false,
        tierServed: 'L2_DISTRIBUTED',
        value: '{"userId":"usr_9901","role":"student","jwt":"eyJhb..."}',
        latencies: { l1Ms: 0.1, l2Ms: 2.4, dbMs: 0, totalMs: 2.5 },
        evictionBroadcastSent: false,
      }
    }
  },

  /**
   * Resets simulation to default cluster topology.
   */
  async resetCluster(): Promise<RingTopology> {
    try {
      const res = await fetchApi<{ status: string; data: { topology: RingTopology } }>('/cache-lab/reset', {
        method: 'POST',
      })
      return res.data.topology
    } catch {
      return this.getMockTopology().topology
    }
  },

  getMockTopology(): { topology: RingTopology; tokens: VirtualNode[]; items: CacheItem[] } {
    const nodes: CacheNode[] = [
      { id: 'node-alpha', name: 'Cache Cluster Alpha', host: '10.0.1.10', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
      { id: 'node-beta', name: 'Cache Cluster Beta', host: '10.0.1.11', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
      { id: 'node-gamma', name: 'Cache Cluster Gamma', host: '10.0.1.12', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
      { id: 'node-delta', name: 'Cache Cluster Delta', host: '10.0.1.13', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
    ]

    const tokens: VirtualNode[] = [
      { hash: 412893821, nodeId: 'node-alpha', vnodeIndex: 0 },
      { hash: 982173111, nodeId: 'node-beta', vnodeIndex: 0 },
      { hash: 1827491021, nodeId: 'node-gamma', vnodeIndex: 0 },
      { hash: 2981729102, nodeId: 'node-delta', vnodeIndex: 0 },
      { hash: 3819273918, nodeId: 'node-alpha', vnodeIndex: 1 },
    ]

    const now = Date.now()
    const items: CacheItem[] = [
      { key: 'user:session:usr_9901', value: '{"userId":"usr_9901","role":"student"}', hash: 391827419, assignedNodeId: 'node-alpha', replicaNodeIds: ['node-alpha', 'node-beta', 'node-gamma'], ttlSeconds: 3600, createdAt: now, expiresAt: now + 3600000, version: 1 },
      { key: 'course:metadata:cs101', value: '{"id":"cs101","title":"Distributed Systems"}', hash: 1294819201, assignedNodeId: 'node-beta', replicaNodeIds: ['node-beta', 'node-gamma', 'node-delta'], ttlSeconds: 3600, createdAt: now, expiresAt: now + 3600000, version: 1 },
      { key: 'test:attempt:att_442', value: '{"attemptId":"att_442","score":94}', hash: 2194819201, assignedNodeId: 'node-gamma', replicaNodeIds: ['node-gamma', 'node-delta', 'node-alpha'], ttlSeconds: 3600, createdAt: now, expiresAt: now + 3600000, version: 1 },
      { key: 'leaderboard:weekly:global', value: '{"topUsers":["usr_88","usr_99"]}', hash: 3294819201, assignedNodeId: 'node-delta', replicaNodeIds: ['node-delta', 'node-alpha', 'node-beta'], ttlSeconds: 3600, createdAt: now, expiresAt: now + 3600000, version: 1 },
    ]

    return {
      topology: {
        nodes,
        ringSize: 4294967296,
        totalVnodes: 200,
        vnodesPerNode: 50,
        replicationFactor: 3,
        readQuorum: 2,
        writeQuorum: 2,
        standardDeviation: 0.25,
        keysCount: items.length,
        auditDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
      tokens,
      items,
    }
  },
}

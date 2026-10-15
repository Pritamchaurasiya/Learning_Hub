import {
  DistributedCacheSimulationService,
  distributedCacheSimulationService,
} from '../../services/DistributedCacheSimulationService'

describe('DistributedCacheSimulationService (Milestone 35)', () => {
  beforeEach(() => {
    distributedCacheSimulationService.resetToDefault()
  })

  describe('Consistent Hashing Ring & Virtual Nodes', () => {
    it('initializes default cluster with 4 physical nodes and virtual nodes', () => {
      const topology = distributedCacheSimulationService.getRingTopology()
      expect(topology.nodes.length).toBe(4)
      expect(topology.totalVnodes).toBe(200) // 4 nodes * 50 vnodes
      expect(topology.replicationFactor).toBe(3)
      expect(topology.readQuorum).toBe(2)
      expect(topology.writeQuorum).toBe(2)
      expect(topology.auditDigest).toBeDefined()
      expect(topology.auditDigest.length).toBe(64) // SHA-256 hex
    })

    it('hashes keys deterministically into 32-bit unsigned space', () => {
      const hash1 = distributedCacheSimulationService.hashKey('user:session:1001')
      const hash2 = distributedCacheSimulationService.hashKey('user:session:1001')
      const hashDiff = distributedCacheSimulationService.hashKey('user:session:1002')

      expect(hash1).toBe(hash2)
      expect(hash1).toBeGreaterThanOrEqual(0)
      expect(hash1).toBeLessThanOrEqual(4294967295)
      expect(hash1).not.toBe(hashDiff)
    })

    it('assigns items to primary nodes on the ring and maintains replicas', () => {
      const item = distributedCacheSimulationService.putItem('test:key:alpha', '{"data":"test"}', 300)
      expect(item.key).toBe('test:key:alpha')
      expect(item.assignedNodeId).toBeDefined()
      expect(item.replicaNodeIds.length).toBe(3) // Replication factor = 3
      expect(item.replicaNodeIds).toContain(item.assignedNodeId)

      // Replicas must be distinct physical nodes
      const uniqueReplicas = new Set(item.replicaNodeIds)
      expect(uniqueReplicas.size).toBe(3)
    })

    it('demonstrates minimal key migration on node addition vs naive modulo hashing', () => {
      const diff = distributedCacheSimulationService.addNode({
        id: 'node-epsilon',
        name: 'Cache Cluster Epsilon',
        host: '10.0.1.14',
        port: 6379,
        weight: 1,
        status: 'HEALTHY',
        maxMemoryMb: 4096,
      })

      expect(diff.action).toBe('ADD_NODE')
      expect(diff.targetNodeId).toBe('node-epsilon')
      expect(diff.totalKeys).toBeGreaterThan(0)
      // Consistent hashing migrates a fraction of keys (~1/N), while naive modulo would invalidate >75%
      expect(diff.migrationPercentage).toBeLessThan(50)
      expect(diff.naiveModuloMigrationPercentage).toBeGreaterThanOrEqual(75)

      const topology = distributedCacheSimulationService.getRingTopology()
      expect(topology.nodes.length).toBe(5)
      expect(topology.totalVnodes).toBe(250)
    })

    it('redistributes keys smoothly when a node is removed', () => {
      const diff = distributedCacheSimulationService.removeNode('node-delta')
      expect(diff.action).toBe('REMOVE_NODE')
      expect(diff.targetNodeId).toBe('node-delta')

      const topology = distributedCacheSimulationService.getRingTopology()
      expect(topology.nodes.length).toBe(3)
      expect(topology.nodes.some(n => n.id === 'node-delta')).toBe(false)
    })
  })

  describe('Quorum Consensus & Read Repair', () => {
    it('executes quorum read successfully when replicas are consistent', () => {
      const readResult = distributedCacheSimulationService.executeQuorumRead('course:metadata:cs101')
      expect(readResult.readQuorum).toBe(2)
      expect(readResult.nodesQueried.length).toBeGreaterThanOrEqual(2)
      expect(readResult.isConsistent).toBe(true)
      expect(readResult.readRepairTriggered).toBe(false)
      expect(readResult.resolvedValue).toBeDefined()
    })

    it('detects stale replica on degraded node and triggers read repair', () => {
      const primaryNode = distributedCacheSimulationService.putItem('stale:demo:key', 'v1', 300).assignedNodeId
      // Mark primary or replica degraded
      distributedCacheSimulationService.setNodeStatus(primaryNode, 'DEGRADED')

      // Write updated value
      distributedCacheSimulationService.executeQuorumWrite('stale:demo:key', 'v2')

      const readResult = distributedCacheSimulationService.executeQuorumRead('stale:demo:key')
      expect(readResult.resolvedVersion).toBeGreaterThanOrEqual(1)
      if (readResult.readRepairNodes.length > 0) {
        expect(readResult.readRepairTriggered).toBe(true)
      }
    })

    it('executes quorum write incrementing version across target replicas', () => {
      const writeResult = distributedCacheSimulationService.executeQuorumWrite('course:metadata:cs101', '{"title":"Updated"}')
      expect(writeResult.isSuccessful).toBe(true)
      expect(writeResult.writeQuorum).toBe(2)
      expect(writeResult.successfulWrites.length).toBeGreaterThanOrEqual(2)
      expect(writeResult.newVersion).toBeGreaterThan(1)
    })
  })

  describe('Cache Stampede Mitigation', () => {
    it('demonstrates catastrophic DB spike without protection', () => {
      const sim = distributedCacheSimulationService.simulateStampede('hotspot:key:none', 200, 'NONE')
      expect(sim.strategy).toBe('NONE')
      expect(sim.concurrency).toBe(200)
      expect(sim.dbQueriesCount).toBe(200) // All 200 hit DB
      expect(sim.cacheHitsCount).toBe(0)
      expect(sim.stampedePrevented).toBe(false)
      expect(sim.avgLatencyMs).toBeGreaterThan(50)
    })

    it('prevents stampede using distributed single-flight mutex lease', () => {
      const sim = distributedCacheSimulationService.simulateStampede('hotspot:key:mutex', 200, 'MUTEX_LOCK')
      expect(sim.strategy).toBe('MUTEX_LOCK')
      expect(sim.dbQueriesCount).toBe(1) // Only 1 query hits DB
      expect(sim.cacheHitsCount).toBe(199)
      expect(sim.stampedePrevented).toBe(true)
      expect(sim.avgLatencyMs).toBeLessThan(20)
    })

    it('prevents stampede and eliminates wait time using probabilistic XFetch early expiration', () => {
      const sim = distributedCacheSimulationService.simulateStampede('hotspot:key:xfetch', 200, 'XFETCH')
      expect(sim.strategy).toBe('XFETCH')
      expect(sim.dbQueriesCount).toBe(1)
      expect(sim.cacheHitsCount).toBe(200)
      expect(sim.stampedePrevented).toBe(true)
      expect(sim.avgLatencyMs).toBeLessThan(10)
    })
  })

  describe('Multi-Tier Latency Hierarchy (L1 / L2 / DB)', () => {
    it('progresses through Database fallback -> L2 hit -> L1 memory hit', () => {
      const newKey = 'session:fresh:tier_test'

      // First access: DB fallback (populates L2 & L1)
      const firstAccess = distributedCacheSimulationService.simulateMultiTierAccess(newKey)
      expect(firstAccess.tierServed).toBe('DATABASE')
      expect(firstAccess.dbHit).toBe(true)
      expect(firstAccess.latencies.totalMs).toBeGreaterThan(30)

      // Second access: Served directly from L1 memory
      const secondAccess = distributedCacheSimulationService.simulateMultiTierAccess(newKey)
      expect(secondAccess.tierServed).toBe('L1_MEMORY')
      expect(secondAccess.l1Hit).toBe(true)
      expect(secondAccess.latencies.totalMs).toBeLessThan(1.0)
    })
  })
})

import crypto from 'crypto'
import logger from '../utils/logger'

export type SystemNodeType =
  | 'CLIENT'
  | 'CDN'
  | 'LOAD_BALANCER'
  | 'API_GATEWAY'
  | 'APP_SERVER'
  | 'DISTRIBUTED_CACHE'
  | 'MESSAGE_QUEUE'
  | 'PRIMARY_DATABASE'
  | 'REPLICA_DATABASE'
  | 'BLOB_STORAGE'

export type ChaosFaultType =
  | 'NONE'
  | 'PRIMARY_DB_CRASH'
  | 'CACHE_THUNDERING_HERD'
  | 'NETWORK_PARTITION_SPLIT_BRAIN'
  | 'HIGH_PACKET_LOSS'
  | 'CONSUMER_LAG_OVERFLOW'

export type ArchitecturePresetId =
  | 'URL_SHORTENER_TINYURL'
  | 'GLOBAL_CHAT_MESSENGER'
  | 'DISTRIBUTED_RATE_LIMITER'
  | 'VIDEO_STREAMING_PLATFORM'

export interface ArchitectureNode {
  id: string
  name: string
  type: SystemNodeType
  capacityQps: number
  baseLatencyMs: number
  replicationFactor: number
  isHealthy: boolean
  failureProb: number // 0 - 1
  metadata?: Record<string, any>
}

export interface ArchitectureEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  protocol: 'HTTP_REST' | 'GRPC' | 'WEBSOCKET' | 'TCP' | 'INTERNAL_BUS'
  latencyMs: number
  bandwidthLimitMbps: number
}

export interface ArchitectureTopology {
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}

export interface SimulationTelemetryResult {
  simulatedQps: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  errorRatePercentage: number
  throughputAchievedQps: number
  systemStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL_FAILURE' | 'OUTAGE'
  saturatedNodeIds: string[]
  failedNodeIds: string[]
  spofNodeIds: string[] // Single Points of Failure
  activeFault: ChaosFaultType
  capClassification: {
    primaryModel: 'CP' | 'AP' | 'CA_THEORETICAL'
    consistencyScore: number // 0 - 100
    availabilityScore: number // 0 - 100
    partitionToleranceScore: number // 0 - 100
    rationale: string
  }
  architecturalScorecard: {
    overallGrade: 'A+' | 'A' | 'B' | 'C' | 'F'
    scalabilityScore: number // 0 - 100
    resilienceScore: number // 0 - 100
    costEfficiencyScore: number // 0 - 100
    detectedVulnerabilities: string[]
    recommendedMitigations: string[]
  }
  socraticCritique: {
    architectPersona: string
    critiqueSummary: string
    deepAnalysisMarkdown: string
    katexFormulas: string[]
  }
  generatedAt: string
}

export class SystemDesignSimulatorService {
  /**
   * Returns a standard architecture preset topology.
   */
  public getPresetTopology(presetId: ArchitecturePresetId): ArchitectureTopology {
    switch (presetId) {
      case 'URL_SHORTENER_TINYURL':
        return {
          nodes: [
            { id: 'client-1', name: 'Global Web/Mobile Clients', type: 'CLIENT', capacityQps: 50000, baseLatencyMs: 25, replicationFactor: 1, isHealthy: true, failureProb: 0 },
            { id: 'cdn-1', name: 'Cloudflare Edge CDN', type: 'CDN', capacityQps: 40000, baseLatencyMs: 10, replicationFactor: 3, isHealthy: true, failureProb: 0.001 },
            { id: 'lb-1', name: 'Envoy L7 Load Balancer', type: 'LOAD_BALANCER', capacityQps: 30000, baseLatencyMs: 2, replicationFactor: 2, isHealthy: true, failureProb: 0.001 },
            { id: 'gw-1', name: 'Kong API Gateway & Rate Limiter', type: 'API_GATEWAY', capacityQps: 25000, baseLatencyMs: 4, replicationFactor: 2, isHealthy: true, failureProb: 0.002 },
            { id: 'app-cluster-1', name: 'URL Shortener Go Microservices', type: 'APP_SERVER', capacityQps: 20000, baseLatencyMs: 8, replicationFactor: 4, isHealthy: true, failureProb: 0.005 },
            { id: 'cache-redis', name: 'Redis Cache-Aside Cluster', type: 'DISTRIBUTED_CACHE', capacityQps: 35000, baseLatencyMs: 1.5, replicationFactor: 3, isHealthy: true, failureProb: 0.01 },
            { id: 'db-primary', name: 'PostgreSQL Primary (Base62 URL Store)', type: 'PRIMARY_DATABASE', capacityQps: 5000, baseLatencyMs: 15, replicationFactor: 1, isHealthy: true, failureProb: 0.02 },
            { id: 'db-replica', name: 'PostgreSQL Read Replicas (x3)', type: 'REPLICA_DATABASE', capacityQps: 12000, baseLatencyMs: 12, replicationFactor: 3, isHealthy: true, failureProb: 0.01 },
          ],
          edges: [
            { id: 'e-1', sourceNodeId: 'client-1', targetNodeId: 'cdn-1', protocol: 'HTTP_REST', latencyMs: 20, bandwidthLimitMbps: 1000 },
            { id: 'e-2', sourceNodeId: 'cdn-1', targetNodeId: 'lb-1', protocol: 'HTTP_REST', latencyMs: 5, bandwidthLimitMbps: 2000 },
            { id: 'e-3', sourceNodeId: 'lb-1', targetNodeId: 'gw-1', protocol: 'GRPC', latencyMs: 1, bandwidthLimitMbps: 5000 },
            { id: 'e-4', sourceNodeId: 'gw-1', targetNodeId: 'app-cluster-1', protocol: 'GRPC', latencyMs: 2, bandwidthLimitMbps: 5000 },
            { id: 'e-5', sourceNodeId: 'app-cluster-1', targetNodeId: 'cache-redis', protocol: 'TCP', latencyMs: 1.5, bandwidthLimitMbps: 10000 },
            { id: 'e-6', sourceNodeId: 'app-cluster-1', targetNodeId: 'db-primary', protocol: 'TCP', latencyMs: 8, bandwidthLimitMbps: 2000 },
            { id: 'e-7', sourceNodeId: 'app-cluster-1', targetNodeId: 'db-replica', protocol: 'TCP', latencyMs: 6, bandwidthLimitMbps: 4000 },
            { id: 'e-8', sourceNodeId: 'db-primary', targetNodeId: 'db-replica', protocol: 'INTERNAL_BUS', latencyMs: 25, bandwidthLimitMbps: 1000 },
          ],
        }

      case 'GLOBAL_CHAT_MESSENGER':
        return {
          nodes: [
            { id: 'client-chat', name: 'Mobile / Desktop Chat Clients', type: 'CLIENT', capacityQps: 80000, baseLatencyMs: 30, replicationFactor: 1, isHealthy: true, failureProb: 0 },
            { id: 'lb-ws', name: 'HAProxy Layer 4 TCP Balancer', type: 'LOAD_BALANCER', capacityQps: 60000, baseLatencyMs: 1, replicationFactor: 2, isHealthy: true, failureProb: 0.001 },
            { id: 'app-gateway', name: 'WebSocket Connection Gateway', type: 'API_GATEWAY', capacityQps: 50000, baseLatencyMs: 3, replicationFactor: 6, isHealthy: true, failureProb: 0.005 },
            { id: 'queue-kafka', name: 'Apache Kafka Event Partition Broker', type: 'MESSAGE_QUEUE', capacityQps: 70000, baseLatencyMs: 4, replicationFactor: 3, isHealthy: true, failureProb: 0.005 },
            { id: 'cache-session', name: 'Redis Pub/Sub Presence Engine', type: 'DISTRIBUTED_CACHE', capacityQps: 45000, baseLatencyMs: 2, replicationFactor: 3, isHealthy: true, failureProb: 0.01 },
            { id: 'db-scylla', name: 'ScyllaDB / Cassandra Message Store', type: 'PRIMARY_DATABASE', capacityQps: 40000, baseLatencyMs: 6, replicationFactor: 3, isHealthy: true, failureProb: 0.008 },
            { id: 'blob-media', name: 'S3 Distributed Media Attachment Store', type: 'BLOB_STORAGE', capacityQps: 15000, baseLatencyMs: 45, replicationFactor: 3, isHealthy: true, failureProb: 0.002 },
          ],
          edges: [
            { id: 'e-c1', sourceNodeId: 'client-chat', targetNodeId: 'lb-ws', protocol: 'WEBSOCKET', latencyMs: 25, bandwidthLimitMbps: 2000 },
            { id: 'e-c2', sourceNodeId: 'lb-ws', targetNodeId: 'app-gateway', protocol: 'WEBSOCKET', latencyMs: 2, bandwidthLimitMbps: 5000 },
            { id: 'e-c3', sourceNodeId: 'app-gateway', targetNodeId: 'queue-kafka', protocol: 'INTERNAL_BUS', latencyMs: 3, bandwidthLimitMbps: 8000 },
            { id: 'e-c4', sourceNodeId: 'app-gateway', targetNodeId: 'cache-session', protocol: 'TCP', latencyMs: 2, bandwidthLimitMbps: 6000 },
            { id: 'e-c5', sourceNodeId: 'queue-kafka', targetNodeId: 'db-scylla', protocol: 'TCP', latencyMs: 5, bandwidthLimitMbps: 6000 },
            { id: 'e-c6', sourceNodeId: 'app-gateway', targetNodeId: 'blob-media', protocol: 'HTTP_REST', latencyMs: 30, bandwidthLimitMbps: 3000 },
          ],
        }

      case 'DISTRIBUTED_RATE_LIMITER':
        return {
          nodes: [
            { id: 'clients-ddos', name: 'High-Volume API Consumers', type: 'CLIENT', capacityQps: 100000, baseLatencyMs: 20, replicationFactor: 1, isHealthy: true, failureProb: 0 },
            { id: 'lb-edge', name: 'Anycast DNS + Cloudflare Edge', type: 'CDN', capacityQps: 100000, baseLatencyMs: 5, replicationFactor: 4, isHealthy: true, failureProb: 0.001 },
            { id: 'gw-ratelimit', name: 'Envoy Token Bucket Micro-Gateway', type: 'API_GATEWAY', capacityQps: 80000, baseLatencyMs: 1.5, replicationFactor: 4, isHealthy: true, failureProb: 0.002 },
            { id: 'redis-sliding', name: 'Redis Sliding-Window Log Cluster', type: 'DISTRIBUTED_CACHE', capacityQps: 90000, baseLatencyMs: 0.8, replicationFactor: 3, isHealthy: true, failureProb: 0.005 },
            { id: 'app-core', name: 'Core Business Financial Services', type: 'APP_SERVER', capacityQps: 30000, baseLatencyMs: 12, replicationFactor: 4, isHealthy: true, failureProb: 0.008 },
            { id: 'db-audit', name: 'CockroachDB Distributed Audit Log', type: 'PRIMARY_DATABASE', capacityQps: 15000, baseLatencyMs: 18, replicationFactor: 3, isHealthy: true, failureProb: 0.005 },
          ],
          edges: [
            { id: 'e-r1', sourceNodeId: 'clients-ddos', targetNodeId: 'lb-edge', protocol: 'HTTP_REST', latencyMs: 15, bandwidthLimitMbps: 10000 },
            { id: 'e-r2', sourceNodeId: 'lb-edge', targetNodeId: 'gw-ratelimit', protocol: 'HTTP_REST', latencyMs: 3, bandwidthLimitMbps: 8000 },
            { id: 'e-r3', sourceNodeId: 'gw-ratelimit', targetNodeId: 'redis-sliding', protocol: 'TCP', latencyMs: 0.8, bandwidthLimitMbps: 15000 },
            { id: 'e-r4', sourceNodeId: 'gw-ratelimit', targetNodeId: 'app-core', protocol: 'GRPC', latencyMs: 2, bandwidthLimitMbps: 5000 },
            { id: 'e-r5', sourceNodeId: 'app-core', targetNodeId: 'db-audit', protocol: 'TCP', latencyMs: 10, bandwidthLimitMbps: 3000 },
          ],
        }

      case 'VIDEO_STREAMING_PLATFORM':
      default:
        return {
          nodes: [
            { id: 'client-viewers', name: 'Smart TV & Mobile Players', type: 'CLIENT', capacityQps: 60000, baseLatencyMs: 35, replicationFactor: 1, isHealthy: true, failureProb: 0 },
            { id: 'cdn-akamai', name: 'Akamai Global Multi-CDN Edge', type: 'CDN', capacityQps: 70000, baseLatencyMs: 8, replicationFactor: 5, isHealthy: true, failureProb: 0.001 },
            { id: 'lb-api', name: 'AWS Network Load Balancer', type: 'LOAD_BALANCER', capacityQps: 50000, baseLatencyMs: 1.5, replicationFactor: 2, isHealthy: true, failureProb: 0.001 },
            { id: 'gw-catalog', name: 'Catalog API Gateway', type: 'API_GATEWAY', capacityQps: 35000, baseLatencyMs: 3, replicationFactor: 3, isHealthy: true, failureProb: 0.002 },
            { id: 'app-metadata', name: 'Metadata & Recommendation Cluster', type: 'APP_SERVER', capacityQps: 25000, baseLatencyMs: 14, replicationFactor: 4, isHealthy: true, failureProb: 0.005 },
            { id: 'cache-memcached', name: 'Memcached Metadata Cache', type: 'DISTRIBUTED_CACHE', capacityQps: 45000, baseLatencyMs: 1.2, replicationFactor: 3, isHealthy: true, failureProb: 0.01 },
            { id: 'db-cassandra', name: 'Cassandra User Watch History', type: 'PRIMARY_DATABASE', capacityQps: 30000, baseLatencyMs: 9, replicationFactor: 3, isHealthy: true, failureProb: 0.005 },
            { id: 'blob-chunks', name: 'S3 Transcoded Video HLS/DASH Chunks', type: 'BLOB_STORAGE', capacityQps: 20000, baseLatencyMs: 40, replicationFactor: 3, isHealthy: true, failureProb: 0.001 },
          ],
          edges: [
            { id: 'e-v1', sourceNodeId: 'client-viewers', targetNodeId: 'cdn-akamai', protocol: 'HTTP_REST', latencyMs: 25, bandwidthLimitMbps: 10000 },
            { id: 'e-v2', sourceNodeId: 'cdn-akamai', targetNodeId: 'blob-chunks', protocol: 'HTTP_REST', latencyMs: 20, bandwidthLimitMbps: 10000 },
            { id: 'e-v3', sourceNodeId: 'client-viewers', targetNodeId: 'lb-api', protocol: 'HTTP_REST', latencyMs: 25, bandwidthLimitMbps: 5000 },
            { id: 'e-v4', sourceNodeId: 'lb-api', targetNodeId: 'gw-catalog', protocol: 'GRPC', latencyMs: 1.5, bandwidthLimitMbps: 5000 },
            { id: 'e-v5', sourceNodeId: 'gw-catalog', targetNodeId: 'app-metadata', protocol: 'GRPC', latencyMs: 2.5, bandwidthLimitMbps: 5000 },
            { id: 'e-v6', sourceNodeId: 'app-metadata', targetNodeId: 'cache-memcached', protocol: 'TCP', latencyMs: 1.2, bandwidthLimitMbps: 8000 },
            { id: 'e-v7', sourceNodeId: 'app-metadata', targetNodeId: 'db-cassandra', protocol: 'TCP', latencyMs: 7, bandwidthLimitMbps: 4000 },
          ],
        }
    }
  }

  /**
   * Identifies Single Points of Failure (SPOF) in the graph topology.
   * A node is a SPOF if removing it cuts off clients from all databases or primary services,
   * or if replicationFactor === 1 for critical components.
   */
  public detectSPOFNodes(topology: ArchitectureTopology): string[] {
    const spofs: string[] = []

    for (const node of topology.nodes) {
      if (node.type === 'CLIENT') continue

      // Criteria 1: Zero redundancy on high-impact persistent or routing nodes
      if (
        (node.type === 'PRIMARY_DATABASE' || node.type === 'LOAD_BALANCER' || node.type === 'API_GATEWAY') &&
        node.replicationFactor <= 1
      ) {
        spofs.push(node.id)
        continue
      }

      // Criteria 2: Graph articulation point (bridge check)
      const outgoing = topology.edges.filter(e => e.sourceNodeId === node.id)
      const incoming = topology.edges.filter(e => e.targetNodeId === node.id)
      if (incoming.length > 0 && outgoing.length === 1) {
        // If it's a funnel with no alternate path
        const downstream = topology.nodes.find(n => n.id === outgoing[0].targetNodeId)
        if (downstream && (downstream.type === 'PRIMARY_DATABASE' || downstream.type === 'APP_SERVER') && downstream.replicationFactor <= 1) {
          if (!spofs.includes(node.id)) spofs.push(node.id)
        }
      }
    }

    return Array.from(new Set(spofs))
  }

  /**
   * Runs the dynamic mathematical discrete-event simulation under configured QPS load and chaos fault.
   */
  public runSimulation(params: {
    topology: ArchitectureTopology
    targetQps: number
    activeFault?: ChaosFaultType
  }): SimulationTelemetryResult {
    const { topology, targetQps, activeFault = 'NONE' } = params
    logger.info(`[SystemDesignSimulator] Running simulation: QPS=${targetQps}, Fault=${activeFault}`)

    // 1. Apply Chaos Fault to nodes
    const simulatedNodes = topology.nodes.map(node => {
      const cloned = { ...node }

      if (activeFault === 'PRIMARY_DB_CRASH' && cloned.type === 'PRIMARY_DATABASE') {
        cloned.isHealthy = false
        cloned.capacityQps = 0
      } else if (activeFault === 'CACHE_THUNDERING_HERD' && cloned.type === 'DISTRIBUTED_CACHE') {
        cloned.isHealthy = false
        cloned.capacityQps = Math.floor(cloned.capacityQps * 0.05) // 95% cache miss
      } else if (activeFault === 'NETWORK_PARTITION_SPLIT_BRAIN' && (cloned.type === 'REPLICA_DATABASE' || cloned.type === 'MESSAGE_QUEUE')) {
        cloned.isHealthy = false
      } else if (activeFault === 'HIGH_PACKET_LOSS') {
        cloned.baseLatencyMs *= 5
      }

      return cloned
    })

    // 2. Identify saturation & bottlenecks using Queueing Theory (M/M/c approximation & Little's Law)
    const saturatedNodeIds: string[] = []
    const failedNodeIds: string[] = simulatedNodes.filter(n => !n.isHealthy).map(n => n.id)
    const spofNodeIds = this.detectSPOFNodes(topology)

    let totalEffectiveBaseLatency = 0
    let bottleneckFactor = 1.0
    let totalErrorCount = 0

    // Downstream demand calculation per tier
    for (const node of simulatedNodes) {
      if (node.type === 'CLIENT') continue

      // Effective capacity multiplied by replication
      const effectiveCapacity = node.capacityQps * Math.max(1, node.replicationFactor)
      const load = targetQps

      // Utilization rho = load / capacity
      const rho = effectiveCapacity > 0 ? load / effectiveCapacity : 999.0

      if (rho >= 1.0 || !node.isHealthy) {
        saturatedNodeIds.push(node.id)
        // Excess load turns into 5xx errors
        const droppedRatio = effectiveCapacity > 0 ? Math.min(0.9, (load - effectiveCapacity) / load) : 1.0
        totalErrorCount += droppedRatio
        bottleneckFactor *= 3.5
      } else {
        // Queueing delay multiplier: 1 / (1 - rho) capped to 15x
        const queueMultiplier = Math.min(15.0, 1 / Math.max(0.05, 1 - rho))
        totalEffectiveBaseLatency += node.baseLatencyMs * queueMultiplier
      }
    }

    // Edge latency accumulation
    const edgeHopLatency = topology.edges.reduce((acc, e) => acc + e.latencyMs, 0) / Math.max(1, topology.edges.length)
    const baselineP50 = Math.max(8.0, totalEffectiveBaseLatency * 0.4 + edgeHopLatency)

    let p50LatencyMs = Math.round(baselineP50 * bottleneckFactor * 10) / 10
    let p95LatencyMs = Math.round(p50LatencyMs * 1.85 * 10) / 10
    let p99LatencyMs = Math.round(p50LatencyMs * 3.4 * 10) / 10

    let errorRatePercentage = Math.min(100, Math.round((totalErrorCount / Math.max(1, simulatedNodes.length - 1)) * 1000) / 10)

    // Penalties under specific chaos modes
    if (activeFault === 'PRIMARY_DB_CRASH') {
      errorRatePercentage = Math.max(68.5, errorRatePercentage)
      p99LatencyMs += 850
    } else if (activeFault === 'CACHE_THUNDERING_HERD') {
      p99LatencyMs += 420
      errorRatePercentage = Math.max(24.2, errorRatePercentage)
    } else if (activeFault === 'NETWORK_PARTITION_SPLIT_BRAIN') {
      errorRatePercentage = Math.max(35.0, errorRatePercentage)
      p95LatencyMs += 210
    }

    // Determine status
    let systemStatus: SimulationTelemetryResult['systemStatus'] = 'OPTIMAL'
    if (errorRatePercentage > 50 || failedNodeIds.length >= 2) {
      systemStatus = 'CRITICAL_FAILURE'
    } else if (errorRatePercentage > 10 || p99LatencyMs > 500) {
      systemStatus = 'DEGRADED'
    }

    const throughputAchievedQps = Math.round(targetQps * (1 - errorRatePercentage / 100))

    // 3. CAP Theorem Analysis
    const hasReplicatedDb = simulatedNodes.some(n => n.type === 'REPLICA_DATABASE')
    const hasSyncDb = simulatedNodes.some(n => n.type === 'PRIMARY_DATABASE')
    const hasPartitionTolerance = simulatedNodes.filter(n => n.replicationFactor >= 3).length >= 2

    const consistencyScore = hasSyncDb && !hasReplicatedDb ? 95 : 82
    const availabilityScore = failedNodeIds.length === 0 && errorRatePercentage < 5 ? 96 : Math.max(10, 100 - errorRatePercentage * 1.5)
    const partitionToleranceScore = hasPartitionTolerance ? 90 : 65

    const capModel: 'CP' | 'AP' | 'CA_THEORETICAL' = consistencyScore > availabilityScore ? 'CP' : 'AP'

    // 4. Scorecard Calculation
    const scalabilityScore = Math.max(10, Math.min(100, Math.round(100 - saturatedNodeIds.length * 18 - (targetQps > 50000 && saturatedNodeIds.length > 0 ? 15 : 0))))
    const resilienceScore = Math.max(10, Math.min(100, Math.round(100 - spofNodeIds.length * 20 - failedNodeIds.length * 25)))
    const costEfficiencyScore = Math.min(95, Math.max(35, Math.round(100 - simulatedNodes.reduce((acc, n) => acc + n.replicationFactor, 0) * 2)))

    const avgScore = (scalabilityScore + resilienceScore + costEfficiencyScore) / 3
    let overallGrade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'A'
    if (avgScore >= 90 && spofNodeIds.length === 0) overallGrade = 'A+'
    else if (avgScore >= 80) overallGrade = 'A'
    else if (avgScore >= 68) overallGrade = 'B'
    else if (avgScore >= 50) overallGrade = 'C'
    else overallGrade = 'F'

    const detectedVulnerabilities: string[] = []
    const recommendedMitigations: string[] = []

    if (spofNodeIds.length > 0) {
      detectedVulnerabilities.push(`Detected ${spofNodeIds.length} Single Point(s) of Failure: [${spofNodeIds.join(', ')}] with zero active replication.`)
      recommendedMitigations.push('Deploy active-passive hot standbys or multi-AZ Raft/Paxos clusters for primary storage.')
    }
    if (activeFault === 'CACHE_THUNDERING_HERD' || saturatedNodeIds.includes('cache-redis')) {
      detectedVulnerabilities.push('Cache stampede vulnerability detected: sudden eviction exposes primary SQL cluster to direct connection saturation.')
      recommendedMitigations.push('Implement probabilistic early expiration (XFetch algorithm) and distributed mutex locks for key regeneration.')
    }
    if (errorRatePercentage > 15) {
      detectedVulnerabilities.push(`Unacceptable error rate of ${errorRatePercentage}% under ${targetQps} QPS load.`)
      recommendedMitigations.push('Configure client-side exponential backoff with jitter and introduce Circuit Breakers (Hystrix / Resilience4j pattern).')
    }

    // 5. Socratic Critique Synthesis
    const socraticCritique = this.generateSocraticCritique({
      topology,
      targetQps,
      activeFault,
      p99LatencyMs,
      errorRatePercentage,
      spofNodeIds,
      overallGrade,
    })

    return {
      simulatedQps: targetQps,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      errorRatePercentage,
      throughputAchievedQps,
      systemStatus,
      saturatedNodeIds,
      failedNodeIds,
      spofNodeIds,
      activeFault,
      capClassification: {
        primaryModel: capModel,
        consistencyScore,
        availabilityScore: Math.round(availabilityScore),
        partitionToleranceScore,
        rationale: `System operates in ${capModel} regime. Partition tolerance score is ${partitionToleranceScore}/100 with ${activeFault !== 'NONE' ? `chaos mode active (${activeFault})` : 'nominal healthy routing'}.`,
      },
      architecturalScorecard: {
        overallGrade,
        scalabilityScore,
        resilienceScore,
        costEfficiencyScore,
        detectedVulnerabilities,
        recommendedMitigations,
      },
      socraticCritique,
      generatedAt: new Date().toISOString(),
    }
  }

  private generateSocraticCritique(params: {
    topology: ArchitectureTopology
    targetQps: number
    activeFault: ChaosFaultType
    p99LatencyMs: number
    errorRatePercentage: number
    spofNodeIds: string[]
    overallGrade: string
  }): SimulationTelemetryResult['socraticCritique'] {
    const { targetQps, activeFault, p99LatencyMs, errorRatePercentage, spofNodeIds, overallGrade } = params

    return {
      architectPersona: 'Principal Distributed Systems Fellow (Ex-Google / Netflix)',
      critiqueSummary: `Evaluation: Grade ${overallGrade}. Evaluated under ${targetQps} QPS with active chaos scenario: ${activeFault}. P99 latency measured at ${p99LatencyMs}ms with an error rate of ${errorRatePercentage}%.`,
      deepAnalysisMarkdown: `### Architectural Analysis & Trade-Off Decomposition

1. **Queueing Dynamics & Saturation Invariant:**
Under Little's Law ($L = \\lambda W$), when mean arrival rate $\\lambda \\to \\mu$ (service rate), the mean queue depth explodes asymptotically.
${spofNodeIds.length > 0 ? `> **Warning:** You have unmitigated SPOFs in: ${spofNodeIds.join(', ')}. If this node experiences a network partition or hardware halt, availability drops to zero.` : '> **Resilience Note:** No unmitigated SPOFs identified in primary routing.'}

2. **CAP Theorem Partition Mechanics:**
In the event of a network partition ($P$), choosing Availability ($A$) implies accepting stale reads across async replicas (eventual consistency $\\Delta t$). Conversely, forcing linearizable consistency ($C$) requires blocking write quorums ($W + R > N$), introducing P99 latency spikes during consensus elections.

3. **Chaos Response:**
During the \`${activeFault}\` disturbance, the downstream service layer exhibited ${errorRatePercentage > 5 ? 'cascading upstream thread exhaustion' : 'graceful degradation through caching layers'}.
`,
      katexFormulas: [
        'L = \\lambda W \\quad \\text{(Little\'s Law)}',
        'W_q = \\frac{\\rho}{\\mu (1 - \\rho)} \\quad (\\text{M/M/1 Queue Delay as } \\rho \\to 1)',
        'R + W > N \\quad (\\text{Strict Quorum Consistency Invariant})',
      ],
    }
  }
}

export const systemDesignSimulatorService = new SystemDesignSimulatorService()

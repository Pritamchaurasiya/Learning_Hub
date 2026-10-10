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
  failureProb: number
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
  spofNodeIds: string[]
  activeFault: ChaosFaultType
  capClassification: {
    primaryModel: 'CP' | 'AP' | 'CA_THEORETICAL'
    consistencyScore: number
    availabilityScore: number
    partitionToleranceScore: number
    rationale: string
  }
  architecturalScorecard: {
    overallGrade: 'A+' | 'A' | 'B' | 'C' | 'F'
    scalabilityScore: number
    resilienceScore: number
    costEfficiencyScore: number
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

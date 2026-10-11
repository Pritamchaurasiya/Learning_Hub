export type ServiceHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRASHED' | 'RECOVERING'
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'
export type NetworkLinkState = 'CONNECTED' | 'PARTITIONED' | 'DEGRADED_LATENCY' | 'PACKET_LOSS'
export type ChaosFaultType =
  | 'NETWORK_PARTITION'
  | 'LATENCY_SPIKE'
  | 'PACKET_LOSS'
  | 'PROCESS_CRASH'
  | 'THREAD_POOL_SATURATION'

export interface ServiceNode {
  id: string
  name: string
  role: 'GATEWAY' | 'CORE_LOGIC' | 'CACHE' | 'DATABASE' | 'MESSAGE_BUS' | 'THIRD_PARTY'
  status: ServiceHealthStatus
  cpuPercent: number
  threadPoolUsed: number
  threadPoolCapacity: number
  errorRatePercent: number
  circuitBreaker: {
    state: CircuitBreakerState
    failureThresholdPercent: number
    consecutiveFailures: number
    fallbackStrategy: 'STALE_CACHE' | 'EMPTY_COLLECTION' | 'FAIL_FAST_429'
    fallbackInvocations: number
  }
}

export interface NetworkLink {
  id: string
  sourceNodeId: string
  targetNodeId: string
  state: NetworkLinkState
  latencyMs: number
  jitterMs: number
  packetLossPercent: number
}

export interface ClusterTopology {
  clusterId: string
  name: string
  description: string
  nodes: ServiceNode[]
  links: NetworkLink[]
}

export interface ChaosExperimentConfig {
  faultType: ChaosFaultType
  targetNodeId?: string
  targetLinkId?: string
  injectedLatencyMs?: number
  injectedPacketLossPercent?: number
  durationSeconds: number
}

export interface ChaosTelemetryEvent {
  timestampOffsetMs: number
  serviceId: string
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'
  message: string
  metricsSnapshot: {
    availabilityPercent: number
    activeThreads: number
    circuitBreakerTripped: boolean
  }
}

export interface ResilienceAuditScorecard {
  overallResilienceGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  availabilitySlaPercent: number
  blastRadiusPercent: number
  meanTimeToRecoverMs: number
  circuitBreakerEffectivenessPercent: number
  cascadingFailuresPrevented: number
  postMortemSummary: string
  mitigationRecommendations: string[]
  cryptographicAuditDigest: string
}

export interface ChaosSimulationResult {
  simulationId: string
  experimentConfig: ChaosExperimentConfig
  initialTopology: ClusterTopology
  finalTopology: ClusterTopology
  telemetryEvents: ChaosTelemetryEvent[]
  auditScorecard: ResilienceAuditScorecard
}

export type RolloutStage =
  | 'PREFLIGHT_HEALTH'
  | 'CANARY_10_PERCENT'
  | 'CANARY_25_PERCENT'
  | 'CANARY_50_PERCENT'
  | 'FULL_PROMOTION'
  | 'ROLLED_BACK'

export type DeploymentStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'EVALUATING'
  | 'HEALTHY'
  | 'ANOMALY_DETECTED'
  | 'PROMOTED'
  | 'ROLLED_BACK'

export type TargetRegion = 'us-east-1' | 'eu-central-1' | 'ap-south-1' | 'global-mesh'

export interface TelemetryMetrics {
  requestsPerSecond: number
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  errorRatePercent: number
  cpuUtilizationPercent: number
  memoryUtilizationPercent: number
  http5xxCount: number
  sampleCount: number
}

export interface AnomalyEvaluation {
  isAnomaly: boolean
  zScore: number
  latencyDegradationRatio: number
  errorRateDelta: number
  errorBudgetConsumedPercent: number
  breachedSloInvariants: string[]
  verdict: 'HEALTHY' | 'DEGRADED' | 'CRITICAL_BREACH'
  recommendation: 'PROCEED' | 'HOLD_EVALUATION' | 'TRIGGER_ROLLBACK'
}

export interface CanaryRelease {
  id: string
  serviceName: string
  version: string
  previousVersion: string
  gitCommitHash: string
  gitCommitMessage: string
  dockerDigest: string
  author: string
  region: TargetRegion
  stage: RolloutStage
  status: DeploymentStatus
  trafficWeightCanary: number
  trafficWeightBaseline: number
  baselineMetrics: TelemetryMetrics
  canaryMetrics: TelemetryMetrics
  lastEvaluation: AnomalyEvaluation
  sloInvariants: {
    maxP99LatencyMs: number
    maxErrorRatePercent: number
    maxLatencyRatio: number
    maxAllowedZScore: number
  }
  historyLogs: Array<{
    timestamp: string
    stage: RolloutStage
    message: string
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
  }>
  provenanceAttestation: {
    signedDigest: string
    verifiedAt: string
  }
}

import crypto from 'crypto'

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
  errorRatePercent: number // e.g. 0.04%
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
  trafficWeightCanary: number // e.g. 10 for 10%
  trafficWeightBaseline: number // e.g. 90
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

export class CanaryDeploymentService {
  private static deployments: Map<string, CanaryRelease> = new Map()

  static {
    // Initialize standard reference archetypes
    CanaryDeploymentService.initializeDefaultDeployments()
  }

  private static initializeDefaultDeployments(): void {
    const defaultArchetypes: CanaryRelease[] = [
      {
        id: 'dep-api-edge-v214',
        serviceName: 'API Gateway & Edge Router',
        version: 'v2.14.0',
        previousVersion: 'v2.13.9',
        gitCommitHash: '7b91d2c4e',
        gitCommitMessage: 'feat(router): optimize zero-copy HTTP/3 multiplexing',
        dockerDigest: 'sha256:7f4ca0dd891823abce',
        author: 'Staff Infra Engineer <infra@learninghub.io>',
        region: 'us-east-1',
        stage: 'CANARY_10_PERCENT',
        status: 'RUNNING',
        trafficWeightCanary: 10,
        trafficWeightBaseline: 90,
        baselineMetrics: {
          requestsPerSecond: 1420,
          p50LatencyMs: 14,
          p95LatencyMs: 42,
          p99LatencyMs: 88,
          errorRatePercent: 0.02,
          cpuUtilizationPercent: 41.5,
          memoryUtilizationPercent: 52.8,
          http5xxCount: 3,
          sampleCount: 15000,
        },
        canaryMetrics: {
          requestsPerSecond: 158,
          p50LatencyMs: 12,
          p95LatencyMs: 38,
          p99LatencyMs: 76,
          errorRatePercent: 0.01,
          cpuUtilizationPercent: 37.2,
          memoryUtilizationPercent: 49.1,
          http5xxCount: 0,
          sampleCount: 1650,
        },
        sloInvariants: {
          maxP99LatencyMs: 180,
          maxErrorRatePercent: 0.1,
          maxLatencyRatio: 1.25,
          maxAllowedZScore: 2.58,
        },
        lastEvaluation: {
          isAnomaly: false,
          zScore: -0.42,
          latencyDegradationRatio: 0.86,
          errorRateDelta: -0.01,
          errorBudgetConsumedPercent: 10,
          breachedSloInvariants: [],
          verdict: 'HEALTHY',
          recommendation: 'PROCEED',
        },
        historyLogs: [
          {
            timestamp: new Date(Date.now() - 600000).toISOString(),
            stage: 'PREFLIGHT_HEALTH',
            message: 'Container health probes verified 200 OK. Secret mounts & DB connection pool warm.',
            level: 'INFO',
          },
          {
            timestamp: new Date(Date.now() - 300000).toISOString(),
            stage: 'CANARY_10_PERCENT',
            message: 'Traffic routed: 90% Baseline / 10% Canary. Automated statistical SLI monitor initialized.',
            level: 'SUCCESS',
          },
        ],
        provenanceAttestation: {
          signedDigest: '0x9fa18c2901eeff48201a',
          verifiedAt: new Date(Date.now() - 650000).toISOString(),
        },
      },
      {
        id: 'dep-auth-zero-trust',
        serviceName: 'Zero-Trust Auth & Session Guardian',
        version: 'v3.2.0',
        previousVersion: 'v3.1.8',
        gitCommitHash: '8f2a1b94e',
        gitCommitMessage: 'sec(auth): enforce RFC 9068 encrypted JWT claims and quantum-resistant key rotation',
        dockerDigest: 'sha256:4a92c810df661bc9',
        author: 'SecOps Lead <security@learninghub.io>',
        region: 'eu-central-1',
        stage: 'CANARY_25_PERCENT',
        status: 'RUNNING',
        trafficWeightCanary: 25,
        trafficWeightBaseline: 75,
        baselineMetrics: {
          requestsPerSecond: 640,
          p50LatencyMs: 22,
          p95LatencyMs: 55,
          p99LatencyMs: 110,
          errorRatePercent: 0.05,
          cpuUtilizationPercent: 48.0,
          memoryUtilizationPercent: 61.2,
          http5xxCount: 5,
          sampleCount: 8000,
        },
        canaryMetrics: {
          requestsPerSecond: 215,
          p50LatencyMs: 20,
          p95LatencyMs: 51,
          p99LatencyMs: 104,
          errorRatePercent: 0.03,
          cpuUtilizationPercent: 44.3,
          memoryUtilizationPercent: 58.0,
          http5xxCount: 1,
          sampleCount: 2600,
        },
        sloInvariants: {
          maxP99LatencyMs: 200,
          maxErrorRatePercent: 0.2,
          maxLatencyRatio: 1.2,
          maxAllowedZScore: 2.58,
        },
        lastEvaluation: {
          isAnomaly: false,
          zScore: -0.28,
          latencyDegradationRatio: 0.94,
          errorRateDelta: -0.02,
          errorBudgetConsumedPercent: 15,
          breachedSloInvariants: [],
          verdict: 'HEALTHY',
          recommendation: 'PROCEED',
        },
        historyLogs: [
          {
            timestamp: new Date(Date.now() - 900000).toISOString(),
            stage: 'PREFLIGHT_HEALTH',
            message: 'Mutual TLS certificate exchange passed across all envoy sidecars.',
            level: 'INFO',
          },
          {
            timestamp: new Date(Date.now() - 450000).toISOString(),
            stage: 'CANARY_10_PERCENT',
            message: 'Initial 10% canary window observed zero auth token rejection anomalies.',
            level: 'SUCCESS',
          },
          {
            timestamp: new Date(Date.now() - 120000).toISOString(),
            stage: 'CANARY_25_PERCENT',
            message: 'Stepped up traffic to 25% Canary. SLI monitoring steady.',
            level: 'INFO',
          },
        ],
        provenanceAttestation: {
          signedDigest: '0x3ec8294ba7719fbc',
          verifiedAt: new Date(Date.now() - 950000).toISOString(),
        },
      },
    ]

    for (const dep of defaultArchetypes) {
      this.deployments.set(dep.id, dep)
    }
  }

  /**
   * Evaluates SLI invariants and statistical anomaly metrics between Baseline and Canary
   */
  public static evaluateMetrics(
    baseline: TelemetryMetrics,
    canary: TelemetryMetrics,
    slo: CanaryRelease['sloInvariants']
  ): AnomalyEvaluation {
    const errorRateDelta = Number((canary.errorRatePercent - baseline.errorRatePercent).toFixed(4))
    const latencyDegradationRatio = Number((canary.p99LatencyMs / Math.max(1, baseline.p99LatencyMs)).toFixed(3))

    // Approximate Z-score calculation on latency sample distribution
    // z = (mean_c - mean_b) / sqrt(variance_b / n_b + variance_c / n_c)
    const stdDevEst = Math.max(1, baseline.p95LatencyMs - baseline.p50LatencyMs)
    const zScore = Number(
      ((canary.p99LatencyMs - baseline.p99LatencyMs) / (stdDevEst * 1.414)).toFixed(3)
    )

    const breachedSloInvariants: string[] = []

    if (canary.p99LatencyMs > slo.maxP99LatencyMs) {
      breachedSloInvariants.push(
        `Canary P99 Latency (${canary.p99LatencyMs}ms) breached SLO threshold (${slo.maxP99LatencyMs}ms)`
      )
    }

    if (canary.errorRatePercent > slo.maxErrorRatePercent) {
      breachedSloInvariants.push(
        `Canary Error Rate (${canary.errorRatePercent}%) breached SLO threshold (${slo.maxErrorRatePercent}%)`
      )
    }

    if (latencyDegradationRatio > slo.maxLatencyRatio) {
      breachedSloInvariants.push(
        `Latency Degradation Ratio (${latencyDegradationRatio}x) exceeded max ratio threshold (${slo.maxLatencyRatio}x)`
      )
    }

    if (zScore > slo.maxAllowedZScore) {
      breachedSloInvariants.push(
        `Statistical Z-Score (${zScore}) breached confidence anomaly threshold (${slo.maxAllowedZScore})`
      )
    }

    const errorBudgetConsumedPercent = Math.min(
      100,
      Math.max(0, Math.round((canary.errorRatePercent / Math.max(0.01, slo.maxErrorRatePercent)) * 100))
    )

    let verdict: AnomalyEvaluation['verdict'] = 'HEALTHY'
    let recommendation: AnomalyEvaluation['recommendation'] = 'PROCEED'

    if (breachedSloInvariants.length > 0) {
      if (canary.errorRatePercent >= slo.maxErrorRatePercent * 1.5 || zScore > 3.0) {
        verdict = 'CRITICAL_BREACH'
        recommendation = 'TRIGGER_ROLLBACK'
      } else {
        verdict = 'DEGRADED'
        recommendation = 'HOLD_EVALUATION'
      }
    }

    return {
      isAnomaly: breachedSloInvariants.length > 0,
      zScore,
      latencyDegradationRatio,
      errorRateDelta,
      errorBudgetConsumedPercent,
      breachedSloInvariants,
      verdict,
      recommendation,
    }
  }

  /**
   * List all tracked deployments
   */
  public static getAllDeployments(): CanaryRelease[] {
    return Array.from(this.deployments.values())
  }

  /**
   * Get specific deployment by ID
   */
  public static getDeploymentById(id: string): CanaryRelease | undefined {
    return this.deployments.get(id)
  }

  /**
   * Initiate a brand new progressive rollout
   */
  public static startRollout(params: {
    serviceName: string
    version: string
    previousVersion?: string
    author?: string
    region?: TargetRegion
    gitCommitHash?: string
    gitCommitMessage?: string
    sloInvariants?: Partial<CanaryRelease['sloInvariants']>
  }): CanaryRelease {
    const id = `dep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    const gitCommitHash = params.gitCommitHash || crypto.randomBytes(4).toString('hex')
    const dockerDigest = `sha256:${crypto.createHash('sha256').update(id + gitCommitHash).digest('hex').substring(0, 16)}`
    const author = params.author || 'Autonomous GitOps Agent <gitops@learninghub.io>'
    const region: TargetRegion = params.region || 'us-east-1'

    const sloInvariants = {
      maxP99LatencyMs: params.sloInvariants?.maxP99LatencyMs ?? 200,
      maxErrorRatePercent: params.sloInvariants?.maxErrorRatePercent ?? 0.1,
      maxLatencyRatio: params.sloInvariants?.maxLatencyRatio ?? 1.25,
      maxAllowedZScore: params.sloInvariants?.maxAllowedZScore ?? 2.58,
    }

    const baselineMetrics: TelemetryMetrics = {
      requestsPerSecond: 1200,
      p50LatencyMs: 18,
      p95LatencyMs: 45,
      p99LatencyMs: 95,
      errorRatePercent: 0.02,
      cpuUtilizationPercent: 38.0,
      memoryUtilizationPercent: 48.5,
      http5xxCount: 2,
      sampleCount: 10000,
    }

    const canaryMetrics: TelemetryMetrics = {
      requestsPerSecond: 120,
      p50LatencyMs: 16,
      p95LatencyMs: 40,
      p99LatencyMs: 82,
      errorRatePercent: 0.01,
      cpuUtilizationPercent: 34.2,
      memoryUtilizationPercent: 44.0,
      http5xxCount: 0,
      sampleCount: 1000,
    }

    const evaluation = this.evaluateMetrics(baselineMetrics, canaryMetrics, sloInvariants)

    const signedDigest = `0x${crypto.createHash('sha256').update(`${id}:${params.version}:${dockerDigest}`).digest('hex').substring(0, 20)}`

    const deployment: CanaryRelease = {
      id,
      serviceName: params.serviceName,
      version: params.version,
      previousVersion: params.previousVersion || 'v1.0.0',
      gitCommitHash,
      gitCommitMessage: params.gitCommitMessage || `Deploy ${params.serviceName} ${params.version}`,
      dockerDigest,
      author,
      region,
      stage: 'CANARY_10_PERCENT',
      status: 'RUNNING',
      trafficWeightCanary: 10,
      trafficWeightBaseline: 90,
      baselineMetrics,
      canaryMetrics,
      lastEvaluation: evaluation,
      sloInvariants,
      historyLogs: [
        {
          timestamp: new Date().toISOString(),
          stage: 'PREFLIGHT_HEALTH',
          message: 'Pre-flight integrity and cryptographic release signature verified.',
          level: 'SUCCESS',
        },
        {
          timestamp: new Date().toISOString(),
          stage: 'CANARY_10_PERCENT',
          message: 'Canary traffic routed at 10%. Real-time telemetry monitoring initiated.',
          level: 'INFO',
        },
      ],
      provenanceAttestation: {
        signedDigest,
        verifiedAt: new Date().toISOString(),
      },
    }

    this.deployments.set(id, deployment)
    return deployment
  }

  /**
   * Advance deployment to the next progressive stage
   */
  public static advanceStage(id: string): CanaryRelease {
    const deployment = this.deployments.get(id)
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`)
    }

    if (deployment.stage === 'FULL_PROMOTION' || deployment.stage === 'ROLLED_BACK') {
      return deployment
    }

    let nextStage: RolloutStage = 'CANARY_25_PERCENT'
    let nextCanaryWeight = 25

    if (deployment.stage === 'CANARY_10_PERCENT') {
      nextStage = 'CANARY_25_PERCENT'
      nextCanaryWeight = 25
    } else if (deployment.stage === 'CANARY_25_PERCENT') {
      nextStage = 'CANARY_50_PERCENT'
      nextCanaryWeight = 50
    } else if (deployment.stage === 'CANARY_50_PERCENT') {
      nextStage = 'FULL_PROMOTION'
      nextCanaryWeight = 100
    }

    deployment.stage = nextStage
    deployment.trafficWeightCanary = nextCanaryWeight
    deployment.trafficWeightBaseline = 100 - nextCanaryWeight

    if (nextStage === 'FULL_PROMOTION') {
      deployment.status = 'PROMOTED'
      deployment.historyLogs.push({
        timestamp: new Date().toISOString(),
        stage: nextStage,
        message: '100% Traffic fully promoted. Canary promoted to new baseline production version.',
        level: 'SUCCESS',
      })
    } else {
      deployment.historyLogs.push({
        timestamp: new Date().toISOString(),
        stage: nextStage,
        message: `Advanced to ${nextStage}. Traffic shifted: ${100 - nextCanaryWeight}% Baseline / ${nextCanaryWeight}% Canary.`,
        level: 'INFO',
      })
    }

    return deployment
  }

  /**
   * Trigger immediate rollback to baseline version
   */
  public static triggerRollback(id: string, reason?: string): CanaryRelease {
    const deployment = this.deployments.get(id)
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`)
    }

    const rollbackReason = reason || 'Manual safety abort triggered or SLI error budget threshold exceeded'

    deployment.stage = 'ROLLED_BACK'
    deployment.status = 'ROLLED_BACK'
    deployment.trafficWeightCanary = 0
    deployment.trafficWeightBaseline = 100
    deployment.historyLogs.push({
      timestamp: new Date().toISOString(),
      stage: 'ROLLED_BACK',
      message: `ROLLBACK TRIGGERED: 100% traffic shifted back to baseline ${deployment.previousVersion}. Reason: ${rollbackReason}`,
      level: 'ERROR',
    })

    return deployment
  }

  /**
   * Injects synthetic traffic load, testing response to anomalies or error spikes
   */
  public static simulateTrafficLoad(
    id: string,
    params: {
      rpsIncrease?: number
      injectErrorRatePercent?: number
      injectLatencySpikeMs?: number
    }
  ): CanaryRelease {
    const deployment = this.deployments.get(id)
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`)
    }

    const rpsIncrease = params.rpsIncrease || 0
    const injectError = params.injectErrorRatePercent || 0
    const injectLatency = params.injectLatencySpikeMs || 0

    // Adjust canary metrics
    deployment.canaryMetrics.requestsPerSecond += rpsIncrease
    deployment.canaryMetrics.errorRatePercent = Number(
      Math.max(0, deployment.canaryMetrics.errorRatePercent + injectError).toFixed(3)
    )
    deployment.canaryMetrics.p99LatencyMs += injectLatency

    // Re-evaluate
    const evaluation = this.evaluateMetrics(
      deployment.baselineMetrics,
      deployment.canaryMetrics,
      deployment.sloInvariants
    )
    deployment.lastEvaluation = evaluation

    if (evaluation.verdict === 'CRITICAL_BREACH') {
      deployment.status = 'ANOMALY_DETECTED'
      deployment.historyLogs.push({
        timestamp: new Date().toISOString(),
        stage: deployment.stage,
        message: `CRITICAL SLI BREACH DETECTED: ${evaluation.breachedSloInvariants.join('; ')}. Initiating autonomous rollback trigger.`,
        level: 'ERROR',
      })
      // Autonomous trigger if critical
      this.triggerRollback(id, `Automated trigger: ${evaluation.breachedSloInvariants.join(', ')}`)
    } else if (evaluation.verdict === 'DEGRADED') {
      deployment.status = 'ANOMALY_DETECTED'
      deployment.historyLogs.push({
        timestamp: new Date().toISOString(),
        stage: deployment.stage,
        message: `Warning: SLI Degradation observed: ${evaluation.breachedSloInvariants.join('; ')}. Holding progression.`,
        level: 'WARN',
      })
    } else {
      deployment.historyLogs.push({
        timestamp: new Date().toISOString(),
        stage: deployment.stage,
        message: `Synthetic traffic injected (+${rpsIncrease} RPS). SLI healthy (Z-Score: ${evaluation.zScore}).`,
        level: 'INFO',
      })
    }

    return deployment
  }
}

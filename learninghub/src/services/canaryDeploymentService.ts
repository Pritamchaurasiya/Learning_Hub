import { api } from '../utils/api'
import {
  CanaryRelease,
  TargetRegion,
} from '../types/canary'

export const FALLBACK_CANARY_DEPLOYMENTS: CanaryRelease[] = [
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
        timestamp: '2026-10-12T11:45:00.000Z',
        stage: 'PREFLIGHT_HEALTH',
        message: 'Container health probes verified 200 OK. Secret mounts & DB connection pool warm.',
        level: 'INFO',
      },
      {
        timestamp: '2026-10-12T11:50:00.000Z',
        stage: 'CANARY_10_PERCENT',
        message: 'Traffic routed: 90% Baseline / 10% Canary. Automated statistical SLI monitor initialized.',
        level: 'SUCCESS',
      },
    ],
    provenanceAttestation: {
      signedDigest: '0x9fa18c2901eeff48201a',
      verifiedAt: '2026-10-12T11:44:00.000Z',
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
        timestamp: '2026-10-12T11:30:00.000Z',
        stage: 'PREFLIGHT_HEALTH',
        message: 'Mutual TLS certificate exchange passed across all envoy sidecars.',
        level: 'INFO',
      },
      {
        timestamp: '2026-10-12T11:38:00.000Z',
        stage: 'CANARY_10_PERCENT',
        message: 'Initial 10% canary window observed zero auth token rejection anomalies.',
        level: 'SUCCESS',
      },
      {
        timestamp: '2026-10-12T11:48:00.000Z',
        stage: 'CANARY_25_PERCENT',
        message: 'Stepped up traffic to 25% Canary. SLI monitoring steady.',
        level: 'INFO',
      },
    ],
    provenanceAttestation: {
      signedDigest: '0x3ec8294ba7719fbc',
      verifiedAt: '2026-10-12T11:29:00.000Z',
    },
  },
]

export class CanaryDeploymentService {
  private static localDeployments: Map<string, CanaryRelease> = new Map(
    FALLBACK_CANARY_DEPLOYMENTS.map(d => [d.id, { ...d }])
  )

  /**
   * Fetch all active canary releases
   */
  public static async fetchDeployments(): Promise<CanaryRelease[]> {
    try {
      const response = await api.get<{ deployments: CanaryRelease[] }>('/deployments/canary')
      if (response && response.deployments && response.deployments.length > 0) {
        return response.deployments
      }
    } catch {
      // Fallback to local memory mock state
    }
    return Array.from(this.localDeployments.values())
  }

  /**
   * Get specific deployment by ID
   */
  public static async getDeployment(id: string): Promise<CanaryRelease> {
    try {
      const response = await api.get<{ deployment: CanaryRelease }>(`/deployments/canary/${id}`)
      if (response && response.deployment) {
        return response.deployment
      }
    } catch {
      // Fallback
    }

    const local = this.localDeployments.get(id)
    if (local) return local
    return FALLBACK_CANARY_DEPLOYMENTS[0]
  }

  /**
   * Start a new canary deployment
   */
  public static async startRollout(params: {
    serviceName: string
    version: string
    previousVersion?: string
    region?: TargetRegion
    gitCommitMessage?: string
    author?: string
  }): Promise<CanaryRelease> {
    try {
      const response = await api.post<{ deployment: CanaryRelease }>('/deployments/canary', params)
      if (response && response.deployment) {
        this.localDeployments.set(response.deployment.id, response.deployment)
        return response.deployment
      }
    } catch {
      // Offline simulation fallback
    }

    const id = `dep-${Date.now().toString(36)}`
    const newDep: CanaryRelease = {
      id,
      serviceName: params.serviceName,
      version: params.version,
      previousVersion: params.previousVersion || 'v1.0.0',
      gitCommitHash: Math.random().toString(16).substring(2, 10),
      gitCommitMessage: params.gitCommitMessage || `Release ${params.version}`,
      dockerDigest: `sha256:${Math.random().toString(16).substring(2, 18)}`,
      author: params.author || 'Deployer <ops@learninghub.io>',
      region: params.region || 'us-east-1',
      stage: 'CANARY_10_PERCENT',
      status: 'RUNNING',
      trafficWeightCanary: 10,
      trafficWeightBaseline: 90,
      baselineMetrics: {
        requestsPerSecond: 1000,
        p50LatencyMs: 15,
        p95LatencyMs: 40,
        p99LatencyMs: 85,
        errorRatePercent: 0.02,
        cpuUtilizationPercent: 35,
        memoryUtilizationPercent: 45,
        http5xxCount: 1,
        sampleCount: 5000,
      },
      canaryMetrics: {
        requestsPerSecond: 110,
        p50LatencyMs: 14,
        p95LatencyMs: 38,
        p99LatencyMs: 80,
        errorRatePercent: 0.01,
        cpuUtilizationPercent: 32,
        memoryUtilizationPercent: 42,
        http5xxCount: 0,
        sampleCount: 550,
      },
      sloInvariants: {
        maxP99LatencyMs: 180,
        maxErrorRatePercent: 0.1,
        maxLatencyRatio: 1.25,
        maxAllowedZScore: 2.58,
      },
      lastEvaluation: {
        isAnomaly: false,
        zScore: -0.2,
        latencyDegradationRatio: 0.94,
        errorRateDelta: -0.01,
        errorBudgetConsumedPercent: 10,
        breachedSloInvariants: [],
        verdict: 'HEALTHY',
        recommendation: 'PROCEED',
      },
      historyLogs: [
        {
          timestamp: new Date().toISOString(),
          stage: 'CANARY_10_PERCENT',
          message: 'Canary traffic routed at 10%. Initializing telemetry watcher.',
          level: 'INFO',
        },
      ],
      provenanceAttestation: {
        signedDigest: `0x${Math.random().toString(16).substring(2, 22)}`,
        verifiedAt: new Date().toISOString(),
      },
    }

    this.localDeployments.set(id, newDep)
    return newDep
  }

  /**
   * Advance stage
   */
  public static async advanceStage(id: string): Promise<CanaryRelease> {
    try {
      const response = await api.post<{ deployment: CanaryRelease }>(`/deployments/canary/${id}/advance`, {})
      if (response && response.deployment) {
        this.localDeployments.set(id, response.deployment)
        return response.deployment
      }
    } catch {
      // Fallback
    }

    const current = this.localDeployments.get(id) || FALLBACK_CANARY_DEPLOYMENTS[0]
    let nextStage: CanaryRelease['stage'] = 'CANARY_25_PERCENT'
    let weight = 25

    if (current.stage === 'CANARY_10_PERCENT') {
      nextStage = 'CANARY_25_PERCENT'
      weight = 25
    } else if (current.stage === 'CANARY_25_PERCENT') {
      nextStage = 'CANARY_50_PERCENT'
      weight = 50
    } else if (current.stage === 'CANARY_50_PERCENT') {
      nextStage = 'FULL_PROMOTION'
      weight = 100
    }

    const updated: CanaryRelease = {
      ...current,
      stage: nextStage,
      status: nextStage === 'FULL_PROMOTION' ? 'PROMOTED' : 'RUNNING',
      trafficWeightCanary: weight,
      trafficWeightBaseline: 100 - weight,
      historyLogs: [
        ...current.historyLogs,
        {
          timestamp: new Date().toISOString(),
          stage: nextStage,
          message: `Advanced to ${nextStage} (${weight}% Canary).`,
          level: 'INFO',
        },
      ],
    }

    this.localDeployments.set(id, updated)
    return updated
  }

  /**
   * Trigger immediate rollback
   */
  public static async triggerRollback(id: string, reason?: string): Promise<CanaryRelease> {
    try {
      const response = await api.post<{ deployment: CanaryRelease }>(`/deployments/canary/${id}/rollback`, { reason })
      if (response && response.deployment) {
        this.localDeployments.set(id, response.deployment)
        return response.deployment
      }
    } catch {
      // Fallback
    }

    const current = this.localDeployments.get(id) || FALLBACK_CANARY_DEPLOYMENTS[0]
    const updated: CanaryRelease = {
      ...current,
      stage: 'ROLLED_BACK',
      status: 'ROLLED_BACK',
      trafficWeightCanary: 0,
      trafficWeightBaseline: 100,
      historyLogs: [
        ...current.historyLogs,
        {
          timestamp: new Date().toISOString(),
          stage: 'ROLLED_BACK',
          message: `ROLLBACK TRIGGERED: ${reason || 'Manual emergency abort'}`,
          level: 'ERROR',
        },
      ],
    }

    this.localDeployments.set(id, updated)
    return updated
  }

  /**
   * Simulate synthetic traffic load
   */
  public static async simulateTrafficLoad(
    id: string,
    params: {
      rpsIncrease?: number
      injectErrorRatePercent?: number
      injectLatencySpikeMs?: number
    }
  ): Promise<CanaryRelease> {
    try {
      const response = await api.post<{ deployment: CanaryRelease }>(`/deployments/canary/${id}/simulate-load`, params)
      if (response && response.deployment) {
        this.localDeployments.set(id, response.deployment)
        return response.deployment
      }
    } catch {
      // Fallback
    }

    const current = this.localDeployments.get(id) || FALLBACK_CANARY_DEPLOYMENTS[0]
    const rps = (params.rpsIncrease || 0) + current.canaryMetrics.requestsPerSecond
    const err = Number(((params.injectErrorRatePercent || 0) + current.canaryMetrics.errorRatePercent).toFixed(3))
    const lat = (params.injectLatencySpikeMs || 0) + current.canaryMetrics.p99LatencyMs

    const isSpike = err > current.sloInvariants.maxErrorRatePercent * 1.5

    const updated: CanaryRelease = {
      ...current,
      status: isSpike ? 'ROLLED_BACK' : current.status,
      stage: isSpike ? 'ROLLED_BACK' : current.stage,
      trafficWeightCanary: isSpike ? 0 : current.trafficWeightCanary,
      trafficWeightBaseline: isSpike ? 100 : current.trafficWeightBaseline,
      canaryMetrics: {
        ...current.canaryMetrics,
        requestsPerSecond: rps,
        errorRatePercent: err,
        p99LatencyMs: lat,
      },
      lastEvaluation: {
        ...current.lastEvaluation,
        verdict: isSpike ? 'CRITICAL_BREACH' : 'HEALTHY',
        recommendation: isSpike ? 'TRIGGER_ROLLBACK' : 'PROCEED',
        breachedSloInvariants: isSpike ? [`Error rate ${err}% breached SLO`] : [],
      },
      historyLogs: [
        ...current.historyLogs,
        {
          timestamp: new Date().toISOString(),
          stage: isSpike ? 'ROLLED_BACK' : current.stage,
          message: isSpike
            ? `SLI BREACH DETECTED: Error rate spike ${err}%. Emergency rollback executed.`
            : `Simulated synthetic load: +${params.rpsIncrease || 0} RPS. Health steady.`,
          level: isSpike ? 'ERROR' : 'INFO',
        },
      ],
    }

    this.localDeployments.set(id, updated)
    return updated
  }
}

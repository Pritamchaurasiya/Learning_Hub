import {
  CanaryDeploymentService,
  TelemetryMetrics,
} from '../../services/CanaryDeploymentService'

describe('CanaryDeploymentService (Milestone 26 GitOps Progressive Delivery)', () => {
  describe('Default Archetypes & Querying', () => {
    it('initializes with default enterprise deployment archetypes', () => {
      const deployments = CanaryDeploymentService.getAllDeployments()
      expect(deployments.length).toBeGreaterThanOrEqual(2)

      const apiEdge = CanaryDeploymentService.getDeploymentById('dep-api-edge-v214')
      expect(apiEdge).toBeDefined()
      expect(apiEdge?.serviceName).toContain('API Gateway')
      expect(apiEdge?.trafficWeightCanary).toBe(10)
      expect(apiEdge?.trafficWeightBaseline).toBe(90)
      expect(apiEdge?.provenanceAttestation.signedDigest).toMatch(/^0x/)
    })

    it('returns undefined for non-existent deployment ID', () => {
      const nonExistent = CanaryDeploymentService.getDeploymentById('invalid-id-xyz')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('evaluateMetrics & Statistical Hypothesis Analysis', () => {
    const baseMetrics: TelemetryMetrics = {
      requestsPerSecond: 1000,
      p50LatencyMs: 15,
      p95LatencyMs: 40,
      p99LatencyMs: 80,
      errorRatePercent: 0.02,
      cpuUtilizationPercent: 40,
      memoryUtilizationPercent: 50,
      http5xxCount: 2,
      sampleCount: 10000,
    }

    const sloInvariants = {
      maxP99LatencyMs: 150,
      maxErrorRatePercent: 0.1,
      maxLatencyRatio: 1.3,
      maxAllowedZScore: 2.58,
    }

    it('returns HEALTHY and PROCEED when canary metrics are within bounds', () => {
      const healthyCanary: TelemetryMetrics = {
        ...baseMetrics,
        requestsPerSecond: 100,
        p99LatencyMs: 78,
        errorRatePercent: 0.015,
      }

      const evalResult = CanaryDeploymentService.evaluateMetrics(
        baseMetrics,
        healthyCanary,
        sloInvariants
      )

      expect(evalResult.isAnomaly).toBe(false)
      expect(evalResult.verdict).toBe('HEALTHY')
      expect(evalResult.recommendation).toBe('PROCEED')
      expect(evalResult.breachedSloInvariants).toHaveLength(0)
    })

    it('flags CRITICAL_BREACH and recommends TRIGGER_ROLLBACK when error rate spikes', () => {
      const degradedCanary: TelemetryMetrics = {
        ...baseMetrics,
        requestsPerSecond: 100,
        p99LatencyMs: 90,
        errorRatePercent: 0.85, // 0.85% vs 0.1% SLO
      }

      const evalResult = CanaryDeploymentService.evaluateMetrics(
        baseMetrics,
        degradedCanary,
        sloInvariants
      )

      expect(evalResult.isAnomaly).toBe(true)
      expect(evalResult.verdict).toBe('CRITICAL_BREACH')
      expect(evalResult.recommendation).toBe('TRIGGER_ROLLBACK')
      expect(evalResult.breachedSloInvariants.length).toBeGreaterThan(0)
      expect(evalResult.breachedSloInvariants[0]).toContain('Canary Error Rate')
    })

    it('flags latency degradation ratio breach when P99 exceeds ratio threshold', () => {
      const slowCanary: TelemetryMetrics = {
        ...baseMetrics,
        requestsPerSecond: 100,
        p99LatencyMs: 140, // 140/80 = 1.75x > 1.3x
      }

      const evalResult = CanaryDeploymentService.evaluateMetrics(
        baseMetrics,
        slowCanary,
        sloInvariants
      )

      expect(evalResult.isAnomaly).toBe(true)
      expect(evalResult.latencyDegradationRatio).toBeGreaterThan(1.3)
      expect(evalResult.breachedSloInvariants.some(b => b.includes('Latency Degradation Ratio'))).toBe(true)
    })
  })

  describe('startRollout & Stage Progression', () => {
    it('initializes a new progressive rollout at 10% canary traffic', () => {
      const rollout = CanaryDeploymentService.startRollout({
        serviceName: 'Payment Microservice',
        version: 'v4.1.0',
        previousVersion: 'v4.0.9',
        region: 'ap-south-1',
        gitCommitMessage: 'feat(payment): add idempotent UPI gateway webhook',
      })

      expect(rollout.id).toMatch(/^dep-/)
      expect(rollout.serviceName).toBe('Payment Microservice')
      expect(rollout.stage).toBe('CANARY_10_PERCENT')
      expect(rollout.trafficWeightCanary).toBe(10)
      expect(rollout.trafficWeightBaseline).toBe(90)
      expect(rollout.provenanceAttestation.signedDigest).toMatch(/^0x/)
      expect(rollout.historyLogs.length).toBeGreaterThanOrEqual(2)
    })

    it('advances sequentially through 25%, 50%, and FULL_PROMOTION stages', () => {
      const rollout = CanaryDeploymentService.startRollout({
        serviceName: 'Catalog Service',
        version: 'v1.8.0',
      })

      // Advance to 25%
      const stage25 = CanaryDeploymentService.advanceStage(rollout.id)
      expect(stage25.stage).toBe('CANARY_25_PERCENT')
      expect(stage25.trafficWeightCanary).toBe(25)
      expect(stage25.trafficWeightBaseline).toBe(75)

      // Advance to 50%
      const stage50 = CanaryDeploymentService.advanceStage(rollout.id)
      expect(stage50.stage).toBe('CANARY_50_PERCENT')
      expect(stage50.trafficWeightCanary).toBe(50)
      expect(stage50.trafficWeightBaseline).toBe(50)

      // Advance to 100% (FULL_PROMOTION)
      const stage100 = CanaryDeploymentService.advanceStage(rollout.id)
      expect(stage100.stage).toBe('FULL_PROMOTION')
      expect(stage100.status).toBe('PROMOTED')
      expect(stage100.trafficWeightCanary).toBe(100)
      expect(stage100.trafficWeightBaseline).toBe(0)
    })
  })

  describe('triggerRollback & Synthetic Load Injection', () => {
    it('executes immediate rollback shifting traffic back to 100% baseline', () => {
      const rollout = CanaryDeploymentService.startRollout({
        serviceName: 'Notification Queue Worker',
        version: 'v2.0.1',
      })

      const rolledBack = CanaryDeploymentService.triggerRollback(
        rollout.id,
        'Database connection pool starvation in replica'
      )

      expect(rolledBack.stage).toBe('ROLLED_BACK')
      expect(rolledBack.status).toBe('ROLLED_BACK')
      expect(rolledBack.trafficWeightCanary).toBe(0)
      expect(rolledBack.trafficWeightBaseline).toBe(100)
      const lastLog = rolledBack.historyLogs[rolledBack.historyLogs.length - 1]
      expect(lastLog.message).toContain('ROLLBACK TRIGGERED')
      expect(lastLog.message).toContain('Database connection pool starvation')
    })

    it('simulates synthetic load injection and triggers automated rollback on critical error', () => {
      const rollout = CanaryDeploymentService.startRollout({
        serviceName: 'Telemetry Aggregator',
        version: 'v3.5.0',
      })

      // Inject severe error rate spike
      const updated = CanaryDeploymentService.simulateTrafficLoad(rollout.id, {
        rpsIncrease: 500,
        injectErrorRatePercent: 1.5, // Well above 0.1% SLO
      })

      expect(updated.status).toBe('ROLLED_BACK')
      expect(updated.trafficWeightCanary).toBe(0)
      expect(updated.lastEvaluation.verdict).toBe('CRITICAL_BREACH')
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  CanaryDeploymentService,
} from './canaryDeploymentService'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('Mock network offline')),
    post: vi.fn().mockRejectedValue(new Error('Mock network offline')),
  },
}))

describe('CanaryDeploymentService (Frontend Client)', () => {
  it('fetches default list of deployments', async () => {
    const list = await CanaryDeploymentService.fetchDeployments()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].id).toBe('dep-api-edge-v214')
    expect(list[0].serviceName).toContain('API Gateway')
  })

  it('retrieves specific deployment by ID', async () => {
    const dep = await CanaryDeploymentService.getDeployment('dep-auth-zero-trust')
    expect(dep).toBeDefined()
    expect(dep.serviceName).toContain('Zero-Trust')
    expect(dep.trafficWeightCanary).toBe(25)
  })

  it('starts a new progressive canary rollout at 10% traffic', async () => {
    const created = await CanaryDeploymentService.startRollout({
      serviceName: 'Recommendation Engine',
      version: 'v3.0.0',
      region: 'ap-south-1',
      gitCommitMessage: 'feat(recs): add graph neural network real-time ranking',
    })

    expect(created.id).toMatch(/^dep-/)
    expect(created.serviceName).toBe('Recommendation Engine')
    expect(created.stage).toBe('CANARY_10_PERCENT')
    expect(created.trafficWeightCanary).toBe(10)
    expect(created.trafficWeightBaseline).toBe(90)
  })

  it('advances stages sequentially to 25%, 50%, and FULL_PROMOTION', async () => {
    const initial = await CanaryDeploymentService.startRollout({
      serviceName: 'Order Processing',
      version: 'v1.5.0',
    })

    const stage25 = await CanaryDeploymentService.advanceStage(initial.id)
    expect(stage25.stage).toBe('CANARY_25_PERCENT')
    expect(stage25.trafficWeightCanary).toBe(25)

    const stage50 = await CanaryDeploymentService.advanceStage(initial.id)
    expect(stage50.stage).toBe('CANARY_50_PERCENT')
    expect(stage50.trafficWeightCanary).toBe(50)

    const full = await CanaryDeploymentService.advanceStage(initial.id)
    expect(full.stage).toBe('FULL_PROMOTION')
    expect(full.status).toBe('PROMOTED')
    expect(full.trafficWeightCanary).toBe(100)
  })

  it('triggers emergency rollback resetting traffic to 100% baseline', async () => {
    const dep = await CanaryDeploymentService.startRollout({
      serviceName: 'Fraud Detection Service',
      version: 'v2.0.0',
    })

    const rolledBack = await CanaryDeploymentService.triggerRollback(
      dep.id,
      'Memory consumption spike in worker pods'
    )

    expect(rolledBack.stage).toBe('ROLLED_BACK')
    expect(rolledBack.status).toBe('ROLLED_BACK')
    expect(rolledBack.trafficWeightCanary).toBe(0)
    expect(rolledBack.trafficWeightBaseline).toBe(100)
  })

  it('simulates synthetic load injection and detects critical breach', async () => {
    const dep = await CanaryDeploymentService.startRollout({
      serviceName: 'Edge CDN Cache',
      version: 'v1.2.0',
    })

    const updated = await CanaryDeploymentService.simulateTrafficLoad(dep.id, {
      rpsIncrease: 300,
      injectErrorRatePercent: 1.5,
    })

    expect(updated.status).toBe('ROLLED_BACK')
    expect(updated.lastEvaluation.verdict).toBe('CRITICAL_BREACH')
    expect(updated.trafficWeightCanary).toBe(0)
  })
})

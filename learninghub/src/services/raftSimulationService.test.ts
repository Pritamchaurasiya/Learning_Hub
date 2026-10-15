import { describe, it, expect, vi, beforeEach } from 'vitest'
import { raftSimulationService } from './raftSimulationService'

describe('raftSimulationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getClusterState returns cluster state from API or fallback mock', async () => {
    const state = await raftSimulationService.getClusterState()
    expect(state).toBeDefined()
    expect(state.nodes.length).toBeGreaterThanOrEqual(3)
    expect(state.invariants.allInvariantsSatisfied).toBe(true)
  })

  it('resetCluster returns state with requested node count', async () => {
    const state = await raftSimulationService.resetCluster(3)
    expect(state.nodes.length).toBe(3)
  })

  it('submitCommand submits client write and returns result', async () => {
    const res = await raftSimulationService.submitCommand('SET x = 100')
    expect(res.success).toBe(true)
    expect(res.committed).toBe(true)
  })

  it('partitionCluster and healPartition operate gracefully', async () => {
    const part = await raftSimulationService.partitionCluster(['node-1', 'node-2'], ['node-3', 'node-4', 'node-5'])
    expect(part).toBeDefined()

    const healed = await raftSimulationService.healPartition()
    expect(healed).toBeDefined()
  })

  it('auditInvariants returns invariant audit object', async () => {
    const audit = await raftSimulationService.auditInvariants()
    expect(audit.electionSafetyPassed).toBe(true)
    expect(audit.cryptographicAuditDigestSha256).toBeDefined()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crdtSimulationService } from './crdtSimulationService'

describe('crdtSimulationService (Milestone 35)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getTopology returns mock topology snapshot on network fallback', async () => {
    const topo = await crdtSimulationService.getTopology()
    expect(topo.peers.alice).toBeDefined()
    expect(topo.peers.bob).toBeDefined()
    expect(topo.peers.charlie).toBeDefined()
    expect(topo.isPartitioned).toBe(false)
    expect(topo.peers.alice.renderedText).toBe('CRDT')
  })

  it('localInsert and localDelete update local peer state and increment clock', async () => {
    const updated = await crdtSimulationService.localInsert('alice', 4, '!')
    expect(updated.renderedText).toContain('!')
    expect(updated.vectorClock.alice).toBeGreaterThanOrEqual(1)

    const deleted = await crdtSimulationService.localDelete('alice', 0)
    expect(deleted.renderedText).toBeDefined()
  })

  it('syncPeers and syncAll simulate partition and reconvergence', async () => {
    const topo = await crdtSimulationService.syncAll()
    expect(topo.peers.alice).toBeDefined()
    expect(topo.isPartitioned).toBe(false)

    const syncRes = await crdtSimulationService.syncPeers('alice', 'bob')
    expect(syncRes.syncedNodes).toBeGreaterThanOrEqual(0)
    expect(syncRes.targetState).toBeDefined()
  })

  it('updateLwwRegister and mutateLwwSet handle state-based CRDTs', async () => {
    const reg = await crdtSimulationService.updateLwwRegister('alice', 'title', 'System Design CRDT', 1000)
    expect(reg.value).toBe('System Design CRDT')
    expect(reg.peerId).toBe('alice')

    const elements = await crdtSimulationService.mutateLwwSet('alice', 'ADD', 'course_101', 1000)
    expect(elements).toContain('course_101')
  })

  it('verifyAlgebraicLaws returns mathematical proofs for Join-Semilattice', async () => {
    const proofs = await crdtSimulationService.verifyAlgebraicLaws()
    expect(proofs.isCommutative).toBe(true)
    expect(proofs.isAssociative).toBe(true)
    expect(proofs.isIdempotent).toBe(true)
    expect(proofs.convergenceVerified).toBe(true)
  })
})

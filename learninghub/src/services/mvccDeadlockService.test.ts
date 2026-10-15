import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mvccDeadlockService } from './mvccDeadlockService'

describe('mvccDeadlockService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getMvccState returns row versions and snapshots', async () => {
    const res = await mvccDeadlockService.getMvccState()
    expect(res).toBeDefined()
    expect(res.currentCommitId).toBe(105)
    expect(res.rowVersions.length).toBeGreaterThanOrEqual(4)
    expect(res.activeSnapshots.length).toBeGreaterThanOrEqual(2)
  })

  it('simulateWriteSkew returns write skew anomaly under Snapshot Isolation', async () => {
    const res = await mvccDeadlockService.simulateWriteSkew('SNAPSHOT_ISOLATION')
    expect(res).toBeDefined()
    expect(res.isolationLevel).toBe('SNAPSHOT_ISOLATION')
    expect(res.anomalyDetected).toBe(true)
    expect(res.transaction1.status).toBe('COMMITTED')
    expect(res.transaction2.status).toBe('COMMITTED')
    expect(res.finalState.every((d) => !d.isOnCall)).toBe(true)
  })

  it('simulateWriteSkew prevents anomaly under Serializable SSI', async () => {
    const res = await mvccDeadlockService.simulateWriteSkew('SERIALIZABLE_SSI')
    expect(res).toBeDefined()
    expect(res.isolationLevel).toBe('SERIALIZABLE_SSI')
    expect(res.anomalyDetected).toBe(false)
    expect(res.transaction2.status).toBe('ABORTED')
  })

  it('detectDeadlock resolves cycle via victim abort', async () => {
    const res = await mvccDeadlockService.detectDeadlock({
      scenario: 'TWO_NODE_CYCLE',
      victimPolicy: 'YOUNGEST',
    })
    expect(res).toBeDefined()
    expect(res.cyclePaths.length).toBe(1)
    expect(res.victimTxId).toBe(302)
    const victim = res.activeTransactions.find((t) => t.txId === 302)
    expect(victim?.status).toBe('VICTIM_ABORTED')
  })

  it('getIsolationComparison returns matrix comparison', async () => {
    const res = await mvccDeadlockService.getIsolationComparison()
    expect(res.levels.length).toBe(5)
    expect(res.summary).toBeDefined()
  })
})

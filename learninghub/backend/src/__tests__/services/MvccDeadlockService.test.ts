import { mvccDeadlockService } from '../../services/MvccDeadlockService'

describe('MvccDeadlockService (Milestone 33)', () => {
  describe('Multi-Version Concurrency Control (MVCC)', () => {
    it('should return MVCC row versions and active transaction visibility snapshots', () => {
      const state = mvccDeadlockService.getMvccState()
      expect(state).toBeDefined()
      expect(state.currentCommitId).toBe(105)
      expect(state.rowVersions.length).toBeGreaterThanOrEqual(4)

      // Test that live versions have xmax = null
      const liveVersions = state.rowVersions.filter((v) => v.xmax === null)
      expect(liveVersions.length).toBeGreaterThanOrEqual(2)
      expect(liveVersions.some((v) => v.rowId === 'course_cs101')).toBe(true)
    })

    it('should demonstrate Write Skew anomaly under Snapshot Isolation', () => {
      const res = mvccDeadlockService.simulateWriteSkew('SNAPSHOT_ISOLATION')
      expect(res.isolationLevel).toBe('SNAPSHOT_ISOLATION')
      expect(res.anomalyDetected).toBe(true)
      expect(res.anomalyType).toBe('WRITE_SKEW_ANOMALY')
      expect(res.transaction1.status).toBe('COMMITTED')
      expect(res.transaction2.status).toBe('COMMITTED')
      // Both doctors went off call -> 0 doctors on call
      const onCall = res.finalState.filter((d) => d.isOnCall)
      expect(onCall.length).toBe(0)
      expect(res.cryptographicProof).toBeDefined()
    })

    it('should prevent Write Skew anomaly under Serializable Snapshot Isolation (SSI)', () => {
      const res = mvccDeadlockService.simulateWriteSkew('SERIALIZABLE_SSI')
      expect(res.isolationLevel).toBe('SERIALIZABLE_SSI')
      expect(res.anomalyDetected).toBe(false)
      expect(res.anomalyType).toBe('SSI_ANTIDEPENDENCY_ABORT')
      expect(res.transaction1.status).toBe('COMMITTED')
      expect(res.transaction2.status).toBe('ABORTED')
      // Exactly 1 doctor remains on call, preserving invariant
      const onCall = res.finalState.filter((d) => d.isOnCall)
      expect(onCall.length).toBe(1)
      expect(res.cryptographicProof).toBeDefined()
    })
  })

  describe('Distributed Deadlock Detection & Tarjan Wait-For Graph', () => {
    it('should detect 2-node cycle and abort selected victim', () => {
      const res = mvccDeadlockService.detectAndResolveDeadlock({
        scenario: 'TWO_NODE_CYCLE',
        victimPolicy: 'YOUNGEST',
      })
      expect(res.cyclePaths.length).toBe(1)
      expect(res.cyclePaths[0]).toEqual([301, 302, 301])
      expect(res.victimTxId).toBe(302)
      const victim = res.activeTransactions.find((t) => t.txId === 302)
      expect(victim?.status).toBe('VICTIM_ABORTED')
      expect(res.cryptographicProof).toBeDefined()
    })

    it('should detect 3-node cycle and abort victim under least priority policy', () => {
      const res = mvccDeadlockService.detectAndResolveDeadlock({
        scenario: 'THREE_NODE_CYCLE',
        victimPolicy: 'LEAST_PRIORITY',
      })
      expect(res.cyclePaths.length).toBe(1)
      expect(res.cyclePaths[0]).toEqual([401, 402, 403, 401])
      expect(res.victimTxId).toBe(401)
      const victim = res.activeTransactions.find((t) => t.txId === 401)
      expect(victim?.status).toBe('VICTIM_ABORTED')
    })

    it('should report DAG with no deadlock when no cycle exists', () => {
      const res = mvccDeadlockService.detectAndResolveDeadlock({
        scenario: 'NO_DEADLOCK',
      })
      expect(res.hasDeadlock).toBe(false)
      expect(res.cyclePaths.length).toBe(0)
      expect(res.victimTxId).toBeNull()
      expect(res.resolutionMessage).toContain('Directed Acyclic Graph')
    })

    it('should return complete isolation levels comparison matrix', () => {
      const comparison = mvccDeadlockService.getIsolationComparison()
      expect(comparison.levels.length).toBe(5)
      const ssi = comparison.levels.find((l) => l.name === 'Serializable (SSI)')
      expect(ssi?.writeSkew).toBe(false)
      const si = comparison.levels.find((l) => l.name === 'Snapshot Isolation (SI)')
      expect(si?.writeSkew).toBe(true)
    })
  })
})

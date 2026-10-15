import { describe, it, expect, vi, beforeEach } from 'vitest'
import { distributedTransactionService } from './distributedTransactionService'

describe('distributedTransactionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('execute2PC happy path returns committed transaction record', async () => {
    const res = await distributedTransactionService.execute2PC()
    expect(res).toBeDefined()
    expect(res.transactionId).toBeDefined()
    expect(res.finalVerdict).toBe('COMMITTED')
    expect(res.participants.length).toBe(3)
    expect(res.participants.every((p) => p.status === 'COMMITTED')).toBe(true)
    expect(res.cryptographicProof).toBeDefined()
  })

  it('execute2PC participant failure triggers abort rollback', async () => {
    const res = await distributedTransactionService.execute2PC({
      failingParticipantId: 'enrollment-db',
    })
    expect(res).toBeDefined()
    expect(res.finalVerdict).toBe('ABORTED')
    const failingP = res.participants.find((p) => p.id === 'enrollment-db')
    expect(failingP?.vote).toBe('VOTE_ABORT')
  })

  it('execute2PC handles coordinator crash simulation', async () => {
    const res = await distributedTransactionService.execute2PC({
      simulateCoordinatorCrash: true,
    })
    expect(res).toBeDefined()
    expect(res.finalVerdict).toBe('BLOCKED_TIMEOUT')
    expect(res.coordinatorStatus).toBe('DECIDING')
  })

  it('executeSaga happy path returns completed saga', async () => {
    const res = await distributedTransactionService.executeSaga()
    expect(res).toBeDefined()
    expect(res.overallStatus).toBe('COMPLETED')
    expect(res.steps.length).toBe(4)
    expect(res.steps.every((s) => s.status === 'SUCCESS')).toBe(true)
    expect(res.compensationHistory.length).toBe(0)
  })

  it('executeSaga failure triggers backward compensating transactions', async () => {
    const res = await distributedTransactionService.executeSaga({
      failingStepIndex: 2,
    })
    expect(res).toBeDefined()
    expect(res.overallStatus).toBe('ROLLED_BACK')
    expect(res.steps[2].status).toBe('FAILED')
    expect(res.steps[0].status).toBe('COMPENSATED')
    expect(res.steps[1].status).toBe('COMPENSATED')
    expect(res.compensationHistory.length).toBe(2)
  })

  it('getComparison returns both 2PC and Saga details', async () => {
    const res = await distributedTransactionService.getComparison()
    expect(res.protocols.twoPhaseCommit.name).toContain('Two-Phase Commit')
    expect(res.protocols.sagaOrchestration.name).toContain('Saga Pattern')
    expect(res.summaryVerdict).toBeDefined()
  })
})

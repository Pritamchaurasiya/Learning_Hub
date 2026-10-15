import { DistributedTransactionService } from '../../services/DistributedTransactionService'

describe('DistributedTransactionService (Milestone 32)', () => {
  let service: DistributedTransactionService

  beforeEach(() => {
    service = new DistributedTransactionService()
  })

  describe('Two-Phase Commit (2PC)', () => {
    test('should execute 2PC happy path where all participants vote commit', () => {
      const result = service.executeTwoPhaseCommit()

      expect(result.finalVerdict).toBe('COMMITTED')
      expect(result.participants.length).toBe(3)
      expect(result.participants.every(p => p.status === 'COMMITTED')).toBe(true)
      expect(result.participants.every(p => p.vote === 'VOTE_COMMIT')).toBe(true)
      expect(result.executionLog.length).toBeGreaterThan(4)
      expect(result.cryptographicProof).toBeDefined()
    })

    test('should abort transaction and rollback all participants if one votes abort', () => {
      const result = service.executeTwoPhaseCommit({
        failingParticipantId: 'enrollment-db',
      })

      expect(result.finalVerdict).toBe('ABORTED')
      const failingNode = result.participants.find(p => p.id === 'enrollment-db')
      expect(failingNode?.vote).toBe('VOTE_ABORT')
      expect(failingNode?.status).toBe('ABORTED')

      // All other participants should also be rolled back (status ABORTED)
      expect(result.participants.every(p => p.status === 'ABORTED')).toBe(true)
    })

    test('should handle coordinator crash during Phase 2 resulting in blocked participants', () => {
      const result = service.executeTwoPhaseCommit({
        simulateCoordinatorCrash: true,
      })

      expect(result.finalVerdict).toBe('BLOCKED_TIMEOUT')
      const preparedNodes = result.participants.filter(p => p.vote === 'VOTE_COMMIT')
      expect(preparedNodes.every(p => p.status === 'LOCKED')).toBe(true)
    })
  })

  describe('Saga Pattern Orchestration', () => {
    test('should execute forward Saga successfully when no step fails', () => {
      const result = service.executeSagaWorkflow()

      expect(result.overallStatus).toBe('COMPLETED')
      expect(result.steps.length).toBe(4)
      expect(result.steps.every(s => s.status === 'SUCCESS')).toBe(true)
      expect(result.compensationHistory.length).toBe(0)
      expect(result.cryptographicProof).toBeDefined()
    })

    test('should trigger backward compensating transactions when Step 3 fails', () => {
      const result = service.executeSagaWorkflow({ failAtStepIndex: 3 })

      expect(result.overallStatus).toBe('ROLLED_BACK')
      const step3 = result.steps.find(s => s.stepIndex === 3)
      expect(step3?.status).toBe('FAILED')

      // Steps 1 and 2 should have been compensated
      const step1 = result.steps.find(s => s.stepIndex === 1)
      const step2 = result.steps.find(s => s.stepIndex === 2)
      expect(step1?.status).toBe('COMPENSATED')
      expect(step2?.status).toBe('COMPENSATED')

      // Step 4 was never executed (still PENDING)
      const step4 = result.steps.find(s => s.stepIndex === 4)
      expect(step4?.status).toBe('PENDING')

      // Compensation history contains exactly 2 compensated actions in reverse order
      expect(result.compensationHistory.length).toBe(2)
      expect(result.compensationHistory[0].compensationAction).toBe('RefundStripePayment')
      expect(result.compensationHistory[1].compensationAction).toBe('CancelOrder')
    })
  })

  describe('Protocol Comparison', () => {
    test('should return detailed architectural trade-offs between 2PC and Saga', () => {
      const comparison = service.getProtocolComparison()
      expect(comparison.protocols.length).toBe(2)
      expect(comparison.protocols.some(p => p.id === 'TWO_PHASE_COMMIT')).toBe(true)
      expect(comparison.protocols.some(p => p.id === 'SAGA_ORCHESTRATOR')).toBe(true)
    })
  })
})

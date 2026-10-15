import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TwoPhaseCommitVisualizer } from './TwoPhaseCommitVisualizer'
import { SagaTimelineOrchestrator } from './SagaTimelineOrchestrator'
import { TransactionChaosControlPanel } from './TransactionChaosControlPanel'
import { TransactionAuditScorecard } from './TransactionAuditScorecard'
import { distributedTransactionService } from '../../services/distributedTransactionService'

describe('Distributed Transaction Visual Components (Milestone 32)', () => {
  const mock2PC = distributedTransactionService.getMock2PCRecord()
  const mockSaga = distributedTransactionService.getMockSagaRecord()
  const mockComparison = distributedTransactionService.getMockComparison()

  describe('TwoPhaseCommitVisualizer', () => {
    it('renders empty message when record is null', () => {
      render(<TwoPhaseCommitVisualizer record={null} />)
      expect(screen.getByText(/No active Two-Phase Commit transaction/i)).toBeInTheDocument()
    })

    it('renders participants and coordinator state on successful 2PC', () => {
      render(<TwoPhaseCommitVisualizer record={mock2PC} />)
      expect(screen.getByText(/Coordinator: Transaction Manager/i)).toBeInTheDocument()
      expect(screen.getAllByText('COMMITTED').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Billing & Invoicing Store')).toBeInTheDocument()
      expect(screen.getByText('Course Enrollment Store')).toBeInTheDocument()
      expect(screen.getByText('Digital Textbook License Store')).toBeInTheDocument()
    })

    it('renders blocking warning when coordinator crashes', () => {
      const blockedRecord = distributedTransactionService.getMock2PCRecord({
        simulateCoordinatorCrash: true,
      })
      render(<TwoPhaseCommitVisualizer record={blockedRecord} />)
      expect(screen.getByText(/2PC Blocking Problem Triggered/i)).toBeInTheDocument()
      expect(screen.getByText('BLOCKED_TIMEOUT')).toBeInTheDocument()
    })
  })

  describe('SagaTimelineOrchestrator', () => {
    it('renders empty message when record is null', () => {
      render(<SagaTimelineOrchestrator record={null} />)
      expect(screen.getByText(/No active Saga execution/i)).toBeInTheDocument()
    })

    it('renders forward steps for successful Saga', () => {
      render(<SagaTimelineOrchestrator record={mockSaga} />)
      expect(screen.getByText('CoursePurchaseAndEnrollmentSaga')).toBeInTheDocument()
      expect(screen.getByText('CreatePendingOrder')).toBeInTheDocument()
      expect(screen.getByText('AuthorizeAndCaptureCharge')).toBeInTheDocument()
      expect(screen.getByText('ReserveCourseSeatAndGrantAccess')).toBeInTheDocument()
      expect(screen.getByText('DispatchReceiptAndWelcomeEmail')).toBeInTheDocument()
    })

    it('renders backward compensation timeline when a step fails', () => {
      const failedSaga = distributedTransactionService.getMockSagaRecord(2)
      render(<SagaTimelineOrchestrator record={failedSaga} />)
      expect(screen.getByText(/Backward Compensation Triggered/i)).toBeInTheDocument()
      expect(screen.getByText('ROLLED_BACK')).toBeInTheDocument()
      expect(screen.getByText(/Executed Backward Compensating Transactions/i)).toBeInTheDocument()
    })
  })

  describe('TransactionChaosControlPanel', () => {
    it('allows protocol toggle and fires execution callbacks', () => {
      const onSelectProtocol = vi.fn()
      const onRun2PC = vi.fn()
      const onRunSaga = vi.fn()

      const { rerender } = render(
        <TransactionChaosControlPanel
          currentProtocol="TWO_PHASE_COMMIT"
          onSelectProtocol={onSelectProtocol}
          onRun2PC={onRun2PC}
          onRunSaga={onRunSaga}
        />
      )

      // Click Happy Path 2PC
      const commitBtn = screen.getByRole('button', { name: /Execute 2PC Commit/i })
      fireEvent.click(commitBtn)
      expect(onRun2PC).toHaveBeenCalled()

      // Switch to Saga
      const sagaToggle = screen.getByRole('button', { name: /Saga Orchestrator/i })
      fireEvent.click(sagaToggle)
      expect(onSelectProtocol).toHaveBeenCalledWith('SAGA_ORCHESTRATOR')

      // Rerender as SAGA_ORCHESTRATOR
      rerender(
        <TransactionChaosControlPanel
          currentProtocol="SAGA_ORCHESTRATOR"
          onSelectProtocol={onSelectProtocol}
          onRun2PC={onRun2PC}
          onRunSaga={onRunSaga}
        />
      )

      const runSagaBtn = screen.getByRole('button', { name: /Execute Complete Saga/i })
      fireEvent.click(runSagaBtn)
      expect(onRunSaga).toHaveBeenCalled()
    })
  })

  describe('TransactionAuditScorecard', () => {
    it('renders comparison cards and proof', () => {
      render(
        <TransactionAuditScorecard
          comparison={mockComparison}
          currentProof="test-proof-sha256-abc"
          protocolName="Two-Phase Commit"
        />
      )

      expect(screen.getByText(/Cryptographic Consensus Audit Seal/i)).toBeInTheDocument()
      expect(screen.getByText('test-proof-sha256-abc')).toBeInTheDocument()
      expect(screen.getAllByText(/Two-Phase Commit/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Saga Pattern/i)).toBeInTheDocument()
    })
  })
})

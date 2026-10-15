import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MvccVersionChainVisualizer } from './MvccVersionChainVisualizer'
import { WriteSkewAnomalySandbox } from './WriteSkewAnomalySandbox'
import { WaitForGraphDeadlockHUD } from './WaitForGraphDeadlockHUD'
import { IsolationLevelAuditCard } from './IsolationLevelAuditCard'
import { mvccDeadlockService } from '../../services/mvccDeadlockService'

describe('Concurrency & Deadlock Visual Components (Milestone 33)', () => {
  const mockMvcc = mvccDeadlockService.getMockMvccState()
  const mockWriteSkewSI = mvccDeadlockService.getMockWriteSkew('SNAPSHOT_ISOLATION')
  const mockWriteSkewSSI = mvccDeadlockService.getMockWriteSkew('SERIALIZABLE_SSI')
  const mockDeadlock = mvccDeadlockService.getMockDeadlock('TWO_NODE_CYCLE', 'YOUNGEST')
  const mockComparison = mvccDeadlockService.getMockIsolationComparison()

  describe('MvccVersionChainVisualizer', () => {
    it('renders empty message when state is null', () => {
      render(<MvccVersionChainVisualizer state={null} />)
      expect(screen.getByText(/No MVCC state loaded/i)).toBeInTheDocument()
    })

    it('renders row versions and allows switching snapshot perspective', () => {
      render(<MvccVersionChainVisualizer state={mockMvcc} />)
      expect(screen.getByText(/Append-Only Version Chains/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Tx #105/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('course_cs101').length).toBeGreaterThanOrEqual(1)

      // Click snapshot Tx 99
      const btnTx99 = screen.getByRole('button', { name: /Tx #99/i })
      fireEvent.click(btnTx99)
      expect(btnTx99).toHaveClass('bg-cyan-600')
    })
  })

  describe('WriteSkewAnomalySandbox', () => {
    it('renders empty message when result is null', () => {
      render(
        <WriteSkewAnomalySandbox
          result={null}
          currentProtocol="SNAPSHOT_ISOLATION"
          onSelectProtocol={vi.fn()}
          onRunSimulation={vi.fn()}
        />
      )
      expect(screen.getByText(/Click "Run Write Skew Simulation"/i)).toBeInTheDocument()
    })

    it('renders write skew anomaly alert under Snapshot Isolation', () => {
      const onSelect = vi.fn()
      const onRun = vi.fn()

      render(
        <WriteSkewAnomalySandbox
          result={mockWriteSkewSI}
          currentProtocol="SNAPSHOT_ISOLATION"
          onSelectProtocol={onSelect}
          onRunSimulation={onRun}
        />
      )

      expect(screen.getByText(/CRITICAL ANOMALY: Write Skew Occurred!/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Dr. Alice Sharma/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Dr. Bob Martinez/i).length).toBeGreaterThanOrEqual(1)

      const ssiBtn = screen.getByRole('button', { name: /Serializable \(SSI\)/i })
      fireEvent.click(ssiBtn)
      expect(onSelect).toHaveBeenCalledWith('SERIALIZABLE_SSI')
    })

    it('renders protection notice under Serializable SSI', () => {
      render(
        <WriteSkewAnomalySandbox
          result={mockWriteSkewSSI}
          currentProtocol="SERIALIZABLE_SSI"
          onSelectProtocol={vi.fn()}
          onRunSimulation={vi.fn()}
        />
      )

      expect(screen.getByText(/ANOMALY PREVENTED/i)).toBeInTheDocument()
      expect(screen.getAllByText(/ON CALL/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('WaitForGraphDeadlockHUD', () => {
    it('renders empty message when result is null', () => {
      render(
        <WaitForGraphDeadlockHUD
          result={null}
          currentScenario="TWO_NODE_CYCLE"
          currentPolicy="YOUNGEST"
          onSelectScenario={vi.fn()}
          onSelectPolicy={vi.fn()}
          onRunDetection={vi.fn()}
        />
      )
      expect(screen.getByText(/Click "Analyze Wait-For Graph"/i)).toBeInTheDocument()
    })

    it('renders cycle detection, victim node, and controls', () => {
      const onSelectScenario = vi.fn()
      const onSelectPolicy = vi.fn()
      const onRun = vi.fn()

      render(
        <WaitForGraphDeadlockHUD
          result={mockDeadlock}
          currentScenario="TWO_NODE_CYCLE"
          currentPolicy="YOUNGEST"
          onSelectScenario={onSelectScenario}
          onSelectPolicy={onSelectPolicy}
          onRunDetection={onRun}
        />
      )

      expect(screen.getByText(/Wait-For Graph \(WFG\) & Deadlock Resolver/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Tx #301/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Tx #302/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('VICTIM_ABORTED')).toBeInTheDocument()

      const runBtn = screen.getByRole('button', { name: /Run Cycle Detection/i })
      fireEvent.click(runBtn)
      expect(onRun).toHaveBeenCalled()
    })
  })

  describe('IsolationLevelAuditCard', () => {
    it('renders table rows and cryptographic proof seal', () => {
      render(
        <IsolationLevelAuditCard
          comparison={mockComparison}
          currentProof="mock-test-proof-sha256-abc"
        />
      )

      expect(screen.getByText(/Isolation Level & Concurrency Anomaly Matrix/i)).toBeInTheDocument()
      expect(screen.getByText('mock-test-proof-sha256-abc')).toBeInTheDocument()
      expect(screen.getByText('Read Committed')).toBeInTheDocument()
      expect(screen.getByText('Repeatable Read')).toBeInTheDocument()
      expect(screen.getByText('Serializable (SSI)')).toBeInTheDocument()
    })
  })
})

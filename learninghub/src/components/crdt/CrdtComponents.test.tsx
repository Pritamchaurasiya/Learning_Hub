import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { crdtSimulationService } from '../../services/crdtSimulationService'
import { PeerEditorSplitView } from './PeerEditorSplitView'
import { RgaTreeVisualizer } from './RgaTreeVisualizer'
import { VectorClockMatrixCard } from './VectorClockMatrixCard'
import { LwwRegisterSetCard } from './LwwRegisterSetCard'
import { CrdtAlgebraicAuditScorecard } from './CrdtAlgebraicAuditScorecard'

describe('CRDT Visualizer Components (Milestone 35)', () => {
  const mockTopology = crdtSimulationService.getMockTopology()
  const mockProof = crdtSimulationService.getMockProof()

  it('PeerEditorSplitView renders all 3 peer cards with online badges', () => {
    render(
      <PeerEditorSplitView
        peers={mockTopology.peers}
        isPartitioned={false}
        isolatedPeers={[]}
        onInsert={vi.fn()}
        onDelete={vi.fn()}
        onSyncPeers={vi.fn()}
        onSyncAll={vi.fn()}
        onTogglePartition={vi.fn()}
      />
    )

    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByText('Charlie')).toBeDefined()
  })

  it('RgaTreeVisualizer renders RGA internal linked list nodes and switches peer views', () => {
    render(<RgaTreeVisualizer peers={mockTopology.peers} />)
    expect(
      screen.getByText(/RGA \(Replicated Growable Array\) Internal Linked List/i)
    ).toBeDefined()
    expect(screen.getByText(/Alice's View/i)).toBeDefined()

    const bobBtn = screen.getByText(/Bob's View/i)
    fireEvent.click(bobBtn)
    expect(screen.getByText(/Bob's View/i)).toBeDefined()
  })

  it('VectorClockMatrixCard renders causal concurrency table', () => {
    render(<VectorClockMatrixCard peers={mockTopology.peers} />)
    expect(screen.getByText(/Vector Clock State Matrix/i)).toBeDefined()
  })

  it('LwwRegisterSetCard renders LWW register and LWW set controls', () => {
    render(
      <LwwRegisterSetCard
        peers={mockTopology.peers}
        onUpdateRegister={vi.fn()}
        onMutateSet={vi.fn()}
      />
    )
    expect(screen.getByText(/LWW-Register \(Document Title\)/i)).toBeDefined()
    expect(screen.getByText(/LWW-Element-Set \(Tags \/ Elements\)/i)).toBeDefined()
  })

  it('CrdtAlgebraicAuditScorecard renders Join-Semilattice mathematical laws', () => {
    render(
      <CrdtAlgebraicAuditScorecard
        proof={mockProof}
        auditDigest={mockTopology.auditDigest}
        onVerify={vi.fn()}
      />
    )
    expect(
      screen.getByText(/Formal Algebraic Semilattice Verification/i)
    ).toBeDefined()
    expect(screen.getByText(/1. Commutativity/i)).toBeDefined()
    expect(screen.getByText(/2. Associativity/i)).toBeDefined()
    expect(screen.getByText(/3. Idempotence/i)).toBeDefined()
  })
})

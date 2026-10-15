import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CrdtStudioPage } from './CrdtStudioPage'
import { crdtSimulationService } from '../services/crdtSimulationService'

vi.mock('../services/crdtSimulationService', () => ({
  crdtSimulationService: {
    getTopology: vi.fn(),
    localInsert: vi.fn(),
    localDelete: vi.fn(),
    syncPeers: vi.fn(),
    syncAll: vi.fn(),
    setPartition: vi.fn(),
    updateLwwRegister: vi.fn(),
    mutateLwwSet: vi.fn(),
    verifyAlgebraicLaws: vi.fn(),
    resetSimulation: vi.fn(),
    getMockTopology: vi.fn(),
  },
}))

const mockTopology = {
  peers: {
    alice: {
      peerId: 'alice',
      name: 'Alice',
      vectorClock: { alice: 4, bob: 2, charlie: 1 },
      lamportClock: 4,
      renderedText: 'CRDT',
      rgaNodes: [
        { id: { peerId: 'alice', clock: 1 }, char: 'C', parent: null, isDeleted: false, lamport: 1 },
        { id: { peerId: 'alice', clock: 2 }, char: 'R', parent: { peerId: 'alice', clock: 1 }, isDeleted: false, lamport: 2 },
      ],
      lwwRegisters: {
        document_title: { key: 'document_title', value: 'System Design', timestamp: 1000, peerId: 'alice' },
      },
      lwwSet: {
        addSet: [{ value: 'dsa', timestamp: 1000, peerId: 'alice' }],
        removeSet: [],
      },
      resolvedSet: ['dsa'],
      isOnline: true,
    },
    bob: {
      peerId: 'bob',
      name: 'Bob',
      vectorClock: { alice: 4, bob: 2, charlie: 1 },
      lamportClock: 4,
      renderedText: 'CRDT',
      rgaNodes: [],
      lwwRegisters: {
        document_title: { key: 'document_title', value: 'System Design', timestamp: 1000, peerId: 'alice' },
      },
      lwwSet: {
        addSet: [{ value: 'dsa', timestamp: 1000, peerId: 'alice' }],
        removeSet: [],
      },
      resolvedSet: ['dsa'],
      isOnline: true,
    },
    charlie: {
      peerId: 'charlie',
      name: 'Charlie',
      vectorClock: { alice: 4, bob: 2, charlie: 1 },
      lamportClock: 4,
      renderedText: 'CRDT',
      rgaNodes: [],
      lwwRegisters: {
        document_title: { key: 'document_title', value: 'System Design', timestamp: 1000, peerId: 'alice' },
      },
      lwwSet: {
        addSet: [{ value: 'dsa', timestamp: 1000, peerId: 'alice' }],
        removeSet: [],
      },
      resolvedSet: ['dsa'],
      isOnline: true,
    },
  },
  isPartitioned: false,
  isolatedPeers: [],
  globalLamport: 4,
  auditDigest: 'sha256_mock_digest',
  lastSyncTimestamp: '2026-10-15T18:00:00Z',
}

const mockProof = {
  isCommutative: true,
  isAssociative: true,
  isIdempotent: true,
  causalityPreserved: true,
  leftRightHash: 'mock_left',
  rightLeftHash: 'mock_right',
  convergenceVerified: true,
  proofDetails: 'Formal verification of semilattice properties hold deterministically.',
}

describe('CrdtStudioPage (Milestone 35)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(crdtSimulationService.getTopology).mockResolvedValue(mockTopology as any)
    vi.mocked(crdtSimulationService.verifyAlgebraicLaws).mockResolvedValue(mockProof as any)
  })

  it('renders page header, status badges, and initial editor tab', async () => {
    render(<CrdtStudioPage />)

    await waitFor(() => {
      expect(screen.getByText(/CRDT & Collaborative State Synchronization Studio/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('switches between tabs: RGA Tree, Vector Clocks, LWW State, and Algebraic Proofs', async () => {
    render(<CrdtStudioPage />)

    await waitFor(() => {
      expect(screen.getByText(/CRDT & Collaborative State Synchronization Studio/i)).toBeInTheDocument()
    })

    // RGA Tree
    const rgaTab = screen.getByRole('button', { name: /RGA Linked List/i })
    fireEvent.click(rgaTab)
    expect(screen.getByText(/RGA \(Replicated Growable Array\) Internal Linked List/i)).toBeInTheDocument()

    // Vector Clocks
    const vectorTab = screen.getByRole('button', { name: /Vector Clocks/i })
    fireEvent.click(vectorTab)
    expect(screen.getByText(/Vector Clock State Matrix/i)).toBeInTheDocument()

    // LWW State
    const lwwTab = screen.getByRole('button', { name: /State-Based CRDTs/i })
    fireEvent.click(lwwTab)
    expect(screen.getAllByText(/LWW-Register/i).length).toBeGreaterThanOrEqual(1)

    // Algebraic Proofs
    const proofsTab = screen.getByRole('button', { name: /Algebraic Proofs/i })
    fireEvent.click(proofsTab)
    expect(screen.getByText(/Formal Algebraic Semilattice Verification/i)).toBeInTheDocument()
  })
})

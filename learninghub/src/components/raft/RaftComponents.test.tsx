import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RaftClusterTopologyHUD } from './RaftClusterTopologyHUD'
import { RaftLogReplicationMatrix } from './RaftLogReplicationMatrix'
import { RaftDisruptionControlPanel } from './RaftDisruptionControlPanel'
import { RaftInvariantAuditCard } from './RaftInvariantAuditCard'
import { RaftNodeState, RaftInvariantAudit } from '../../types/raftSimulation'

const mockNodes: RaftNodeState[] = [
  {
    id: 'node-1',
    name: 'Server 1 (node-1)',
    role: 'LEADER',
    currentTerm: 1,
    votedFor: 'node-1',
    log: [{ index: 1, term: 1, command: 'INIT_CLUSTER' }],
    commitIndex: 1,
    lastApplied: 1,
    electionTimeoutMs: 200,
    electionElapsedMs: 20,
    heartbeatIntervalMs: 50,
    partitionGroup: 'DEFAULT',
    isAlive: true,
    stateMachine: { cluster: 'online', nodes: 2 },
  },
  {
    id: 'node-2',
    name: 'Server 2 (node-2)',
    role: 'FOLLOWER',
    currentTerm: 1,
    votedFor: 'node-1',
    log: [{ index: 1, term: 1, command: 'INIT_CLUSTER' }],
    commitIndex: 1,
    lastApplied: 1,
    electionTimeoutMs: 250,
    electionElapsedMs: 80,
    heartbeatIntervalMs: 50,
    partitionGroup: 'DEFAULT',
    isAlive: true,
    stateMachine: { cluster: 'online', nodes: 2 },
  },
]

const mockInvariants: RaftInvariantAudit = {
  electionSafetyPassed: true,
  leaderAppendOnlyPassed: true,
  logMatchingPassed: true,
  leaderCompletenessPassed: true,
  stateMachineSafetyPassed: true,
  allInvariantsSatisfied: true,
  cryptographicAuditDigestSha256: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  details: ['Election safety verified.'],
}

describe('Raft Components (Milestone 31)', () => {
  it('renders RaftClusterTopologyHUD with nodes and triggers election', () => {
    const onSelect = vi.fn()
    const onTriggerElection = vi.fn()
    const onToggleCrash = vi.fn()

    render(
      <RaftClusterTopologyHUD
        nodes={mockNodes}
        leaderId="node-1"
        networkPartitionActive={false}
        selectedNodeId="node-1"
        onSelectNode={onSelect}
        onTriggerElection={onTriggerElection}
        onToggleNodeCrash={onToggleCrash}
      />
    )

    expect(screen.getByText(/Cluster Node Topology/i)).toBeInTheDocument()
    expect(screen.getByText('Server 1 (node-1)')).toBeInTheDocument()
    expect(screen.getByText('Server 2 (node-2)')).toBeInTheDocument()
    expect(screen.getByText('LEADER')).toBeInTheDocument()

    // Trigger election on node-2
    const triggerButtons = screen.getAllByRole('button', { name: /Trigger Vote/i })
    fireEvent.click(triggerButtons[0])
    expect(onTriggerElection).toHaveBeenCalled()
  })

  it('renders RaftLogReplicationMatrix with committed entries and state machine snapshot', () => {
    render(<RaftLogReplicationMatrix nodes={mockNodes} leaderId="node-1" />)

    expect(screen.getByText(/Distributed Replicated Log Matrix/i)).toBeInTheDocument()
    expect(screen.getByText(/Index #1/i)).toBeInTheDocument()
    expect(screen.getAllByText('INIT_CLUSTER').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Deterministic State Machine Applied State/i)).toBeInTheDocument()
  })

  it('renders RaftDisruptionControlPanel and interacts with controls', () => {
    const onTogglePlay = vi.fn()
    const onStepTick = vi.fn()
    const onResetCluster = vi.fn()
    const onInjectSplitBrain = vi.fn()
    const onHealPartition = vi.fn()
    const onSubmitClientCommand = vi.fn()

    render(
      <RaftDisruptionControlPanel
        isPlaying={false}
        networkPartitionActive={false}
        isSubmitting={false}
        onTogglePlay={onTogglePlay}
        onStepTick={onStepTick}
        onResetCluster={onResetCluster}
        onInjectSplitBrain={onInjectSplitBrain}
        onHealPartition={onHealPartition}
        onSubmitClientCommand={onSubmitClientCommand}
      />
    )

    expect(screen.getByText(/Interactive Consensus Lab/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Auto-Tick Clock/i }))
    expect(onTogglePlay).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Step Tick/i }))
    expect(onStepTick).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Inject Split-Brain/i }))
    expect(onInjectSplitBrain).toHaveBeenCalled()
  })

  it('renders RaftInvariantAuditCard and verifies 5 invariant rules', () => {
    render(<RaftInvariantAuditCard invariants={mockInvariants} />)

    expect(screen.getByText(/Formal Raft Consensus Safety Invariant Verification/i)).toBeInTheDocument()
    expect(screen.getByText('Election Safety')).toBeInTheDocument()
    expect(screen.getByText('Leader Append-Only')).toBeInTheDocument()
    expect(screen.getByText('Log Matching')).toBeInTheDocument()
    expect(screen.getByText('Leader Completeness')).toBeInTheDocument()
    expect(screen.getByText('State Machine Safety')).toBeInTheDocument()
    expect(screen.getByText(mockInvariants.cryptographicAuditDigestSha256)).toBeInTheDocument()
  })
})

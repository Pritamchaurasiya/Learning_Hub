import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConsistentHashingRingVisualizer } from './ConsistentHashingRingVisualizer'
import { CacheStampedeSandbox } from './CacheStampedeSandbox'
import { QuorumTunerControlPanel } from './QuorumTunerControlPanel'
import { MultiTierLatencyWaterfall } from './MultiTierLatencyWaterfall'
import { CacheAuditScorecard } from './CacheAuditScorecard'
import type { RingTopology, CacheItem } from '../../types/distributedCache'

const mockTopology: RingTopology = {
  nodes: [
    { id: 'node-alpha', name: 'Cache Cluster Alpha', host: '10.0.1.10', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
    { id: 'node-beta', name: 'Cache Cluster Beta', host: '10.0.1.11', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
    { id: 'node-gamma', name: 'Cache Cluster Gamma', host: '10.0.1.12', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
    { id: 'node-delta', name: 'Cache Cluster Delta', host: '10.0.1.13', port: 6379, weight: 1, status: 'HEALTHY', keysCount: 2, memoryUsedMb: 128, maxMemoryMb: 4096 },
  ],
  ringSize: 4294967296,
  totalVnodes: 200,
  vnodesPerNode: 50,
  replicationFactor: 3,
  readQuorum: 2,
  writeQuorum: 2,
  standardDeviation: 0.25,
  keysCount: 4,
  auditDigest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
}

const mockItems: CacheItem[] = [
  { key: 'user:session:usr_9901', value: 'val1', hash: 391827419, assignedNodeId: 'node-alpha', replicaNodeIds: ['node-alpha', 'node-beta', 'node-gamma'], ttlSeconds: 3600, createdAt: 1000, expiresAt: 4600, version: 1 },
]

describe('CacheComponents (Milestone 35)', () => {
  it('ConsistentHashingRingVisualizer renders ring title, nodes, and keys count', () => {
    render(
      <ConsistentHashingRingVisualizer
        topology={mockTopology}
        items={mockItems}
        onAddNode={vi.fn()}
        onRemoveNode={vi.fn()}
        onPutItem={vi.fn()}
      />
    )

    expect(screen.getByText(/Consistent Hashing Ring/i)).toBeInTheDocument()
    expect(screen.getByText(/ACTIVE KEYS/i)).toBeInTheDocument()
    expect(screen.getByText('Cache Cluster Alpha')).toBeInTheDocument()
  })

  it('CacheStampedeSandbox renders strategy selection and simulation button', () => {
    render(<CacheStampedeSandbox onSimulate={vi.fn()} />)
    expect(screen.getByText(/Cache Stampede/i)).toBeInTheDocument()
    expect(screen.getByText(/Mutex Lease/i)).toBeInTheDocument()
    expect(screen.getByText(/Probabilistic XFetch/i)).toBeInTheDocument()
    expect(screen.getByText(/Run Stress Test/i)).toBeInTheDocument()
  })

  it('QuorumTunerControlPanel renders N, R, W sliders and strong consistency badge', () => {
    render(
      <QuorumTunerControlPanel
        initialN={3}
        initialR={2}
        initialW={2}
        onExecuteRead={vi.fn()}
        onExecuteWrite={vi.fn()}
      />
    )
    expect(screen.getByText(/Tunable Quorum Consistency Studio/i)).toBeInTheDocument()
    expect(screen.getByText(/Strong Consistency/i)).toBeInTheDocument()
    expect(screen.getByText(/Quorum Read/i)).toBeInTheDocument()
  })

  it('MultiTierLatencyWaterfall renders L1, L2, and Database tiers', () => {
    render(<MultiTierLatencyWaterfall onSimulateAccess={vi.fn()} />)
    expect(screen.getByText(/L1 In-Memory LRU/i)).toBeInTheDocument()
    expect(screen.getByText(/L2 Distributed Cluster/i)).toBeInTheDocument()
    expect(screen.getByText(/Primary Persistent DB/i)).toBeInTheDocument()
  })

  it('CacheAuditScorecard renders SHA-256 seal and algorithm comparison table', () => {
    render(<CacheAuditScorecard topology={mockTopology} />)
    expect(screen.getByText(/Cluster Topology Health/i)).toBeInTheDocument()
    expect(screen.getByText(mockTopology.auditDigest)).toBeInTheDocument()
    expect(screen.getByText(/Consistent Hashing \(vnodes\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Naive Modulo/i)).toBeInTheDocument()
  })
})

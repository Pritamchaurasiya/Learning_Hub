import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DistributedCacheStudioPage } from './DistributedCacheStudioPage'
import { distributedCacheService } from '../services/distributedCacheService'

vi.mock('../services/distributedCacheService', () => ({
  distributedCacheService: {
    getTopology: vi.fn(),
    putItem: vi.fn(),
    addNode: vi.fn(),
    removeNode: vi.fn(),
    executeQuorumRead: vi.fn(),
    executeQuorumWrite: vi.fn(),
    simulateStampede: vi.fn(),
    simulateMultiTierAccess: vi.fn(),
    resetCluster: vi.fn(),
    getMockTopology: vi.fn(),
  },
}))

const mockTopologyData = {
  topology: {
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
  },
  tokens: [
    { hash: 412893821, nodeId: 'node-alpha', vnodeIndex: 0 },
    { hash: 982173111, nodeId: 'node-beta', vnodeIndex: 0 },
  ],
  items: [
    { key: 'user:session:usr_9901', value: 'val1', hash: 391827419, assignedNodeId: 'node-alpha', replicaNodeIds: ['node-alpha', 'node-beta', 'node-gamma'], ttlSeconds: 3600, createdAt: 1000, expiresAt: 4600, version: 1 },
  ],
}

describe('DistributedCacheStudioPage (Milestone 35)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(distributedCacheService.getTopology).mockResolvedValue(mockTopologyData as any)
  })

  it('renders page header, scaffolding cards, and initial ring topology tab', async () => {
    render(<DistributedCacheStudioPage />)

    await waitFor(() => {
      expect(screen.getByText(/Consistent Hashing & Distributed Cache Studio/i)).toBeInTheDocument()
    })

    expect(screen.getAllByText(/Consistent Hashing Ring/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Cache Cluster Alpha')).toBeInTheDocument()
  })

  it('switches between tabs: Stampede, Quorum, Waterfall, and Audit Scorecard', async () => {
    render(<DistributedCacheStudioPage />)

    await waitFor(() => {
      expect(screen.getByText(/Consistent Hashing & Distributed Cache Studio/i)).toBeInTheDocument()
    })

    // Switch to Stampede Tab
    const stampedeTabBtn = screen.getByRole('button', { name: /Cache Stampede \(XFetch\)/i })
    fireEvent.click(stampedeTabBtn)
    expect(screen.getByText(/Thundering Herd\) Sandbox/i)).toBeInTheDocument()

    // Switch to Quorum Tuner Tab
    const quorumTabBtn = screen.getByRole('button', { name: /Quorum Tuner/i })
    fireEvent.click(quorumTabBtn)
    expect(screen.getByText(/Tunable Quorum Consistency Studio/i)).toBeInTheDocument()

    // Switch to Multi-Tier Waterfall Tab
    const waterfallTabBtn = screen.getByRole('button', { name: /Multi-Tier Waterfall/i })
    fireEvent.click(waterfallTabBtn)
    expect(screen.getByText(/Multi-Tier Cache Latency Waterfall/i)).toBeInTheDocument()

    // Switch to Audit Scorecard Tab
    const auditTabBtn = screen.getByRole('button', { name: /Audit Scorecard/i })
    fireEvent.click(auditTabBtn)
    expect(screen.getByText(/Cluster Topology Health/i)).toBeInTheDocument()
  })
})

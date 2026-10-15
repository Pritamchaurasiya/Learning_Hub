import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LsmStorageStudioPage } from './LsmStorageStudioPage'
import { lsmSimulationService } from '../services/lsmSimulationService'
import type { LsmTopologySnapshot } from '../types/lsmSimulation'

const mockSnapshot: LsmTopologySnapshot = {
  stats: {
    memTableEntries: 2,
    memTableMaxEntries: 6,
    memTableUsagePercent: 33,
    walEntriesCount: 2,
    totalSstables: 1,
    sstablesByLevel: { 0: 1 },
    totalDiskSizeBytes: 420,
    writeAmplification: 1.15,
    readAmplification: 1.05,
    spaceAmplification: 1.1,
    bloomFilterHitRate: 98.5,
    totalReads: 10,
    totalWrites: 5,
    totalCompactions: 1,
    auditDigest: 'sha256-mock-digest-12345',
  },
  memTable: [
    { key: 'user:alpha', value: 'Alice', isTombstone: false, sequenceNumber: 1, timestamp: '' },
  ],
  wal: [
    { sequenceNumber: 1, key: 'user:alpha', value: 'Alice', isTombstone: false, timestamp: '', crc32: 'c1' },
  ],
  sstables: [
    {
      id: 'sst_L0_001',
      level: 0,
      keyCount: 1,
      minKey: 'course:101',
      maxKey: 'course:101',
      sizeBytes: 150,
      createdAt: new Date().toISOString(),
      sparseIndex: [{ key: 'course:101', offset: 0 }],
      entries: [
        { key: 'course:101', value: 'DS Core', isTombstone: false, sequenceNumber: 1, timestamp: '' },
      ],
      bloomFilter: {
        sizeBits: 256,
        hashCount: 4,
        bitArrayHex: '0a804100',
        setBitsCount: 8,
        fillRatio: 0.0312,
        estimatedFpRate: 0.0001,
        probesCount: 5,
        trueNegatives: 4,
        falsePositives: 0,
      },
    },
  ],
}

describe('LsmStorageStudioPage (Milestone 37)', () => {
  it('loads snapshot and switches across tabs (MemTable, SSTables, Bloom, Audit)', async () => {
    vi.spyOn(lsmSimulationService, 'getSnapshot').mockResolvedValue(mockSnapshot)

    render(
      <MemoryRouter>
        <LsmStorageStudioPage />
      </MemoryRouter>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/MemTable \(In-Memory SkipList\)/i)).toBeInTheDocument()
    })

    // Switch to SSTables tab
    const sstableTabBtn = screen.getByRole('button', { name: /SSTable Hierarchy/i })
    fireEvent.click(sstableTabBtn)
    expect(screen.getByText(/SSTable Level Hierarchy/i)).toBeInTheDocument()

    // Switch to Bloom Filter tab
    const bloomTabBtn = screen.getByRole('button', { name: /Bloom Filter Lab/i })
    fireEvent.click(bloomTabBtn)
    expect(screen.getByText(/Bloom Filter Probabilistic Membership Engine/i)).toBeInTheDocument()

    // Switch to Audit tab
    const auditTabBtn = screen.getByRole('button', { name: /Storage Engine Audit/i })
    fireEvent.click(auditTabBtn)
    expect(screen.getByText(/Write Amplification \(WA\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Storage Engine Architectural Comparison/i)).toBeInTheDocument()
  })
})

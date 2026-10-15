import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemTableWalVisualizer } from './MemTableWalVisualizer'
import { SSTableLevelHierarchyView } from './SSTableLevelHierarchyView'
import { BloomFilterBitsetInspector } from './BloomFilterBitsetInspector'
import { StorageEngineAuditCard } from './StorageEngineAuditCard'
import type { SsTableSnapshot, StorageEngineStats } from '../../types/lsmSimulation'

const mockSstables: SsTableSnapshot[] = [
  {
    id: 'sst_L0_001',
    level: 0,
    keyCount: 3,
    minKey: 'course:101',
    maxKey: 'user:beta',
    sizeBytes: 320,
    createdAt: new Date().toISOString(),
    sparseIndex: [{ key: 'course:101', offset: 0 }],
    entries: [
      { key: 'course:101', value: 'DS Core', isTombstone: false, sequenceNumber: 1, timestamp: '' },
      { key: 'user:alpha', value: 'Alice', isTombstone: false, sequenceNumber: 2, timestamp: '' },
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
]

const mockStats: StorageEngineStats = {
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
}

describe('LSM Studio Components (Milestone 37)', () => {
  it('renders MemTableWalVisualizer with active entries and form inputs', () => {
    const onPut = vi.fn()
    const onDelete = vi.fn()
    const onFlush = vi.fn()

    render(
      <MemTableWalVisualizer
        memTable={[
          { key: 'user:alice', value: 'PRO', isTombstone: false, sequenceNumber: 1, timestamp: '' },
        ]}
        wal={[
          { sequenceNumber: 1, key: 'user:alice', value: 'PRO', isTombstone: false, timestamp: '', crc32: 'c1' },
        ]}
        maxMemTableEntries={6}
        onPut={onPut}
        onDelete={onDelete}
        onFlush={onFlush}
      />
    )

    expect(screen.getByText(/MemTable \(In-Memory SkipList\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Write-Ahead Log \(WAL\)/i)).toBeInTheDocument()
    expect(screen.getAllByText('user:alice').length).toBeGreaterThanOrEqual(1)
  })

  it('renders SSTableLevelHierarchyView and toggles inspection drawer', () => {
    const onCompact = vi.fn()
    render(<SSTableLevelHierarchyView sstables={mockSstables} onCompact={onCompact} />)

    expect(screen.getByText(/SSTable Level Hierarchy/i)).toBeInTheDocument()
    expect(screen.getByText('sst_L0_001')).toBeInTheDocument()

    const inspectBtn = screen.getByText(/Inspect Index & Entries/i)
    fireEvent.click(inspectBtn)
    expect(screen.getByText(/Sparse Index/i)).toBeInTheDocument()
  })

  it('renders BloomFilterBitsetInspector with bitset stats and probe query input', () => {
    const onProbeKey = vi.fn().mockResolvedValue({
      key: 'course:101',
      found: true,
      value: 'DS Core',
      source: 'SSTABLE',
      checkedMemTable: true,
      sstablesChecked: 1,
      bloomFilterSkipped: 0,
      durationMs: 2,
    })

    render(<BloomFilterBitsetInspector sstables={mockSstables} onProbeKey={onProbeKey} />)

    expect(screen.getByText(/Bloom Filter Probabilistic Membership Engine/i)).toBeInTheDocument()
    expect(screen.getByText(/Bloom Bitset Array/i)).toBeInTheDocument()
  })

  it('renders StorageEngineAuditCard with WA/RA/SA metrics and B+Tree comparison', () => {
    const onCrashRecover = vi.fn()
    render(<StorageEngineAuditCard stats={mockStats} onCrashRecover={onCrashRecover} />)

    expect(screen.getByText(/Write Amplification \(WA\)/i)).toBeInTheDocument()
    expect(screen.getByText('1.15x')).toBeInTheDocument()
    expect(screen.getByText(/Storage Engine Architectural Comparison/i)).toBeInTheDocument()
    expect(screen.getByText('sha256-mock-digest-12345')).toBeInTheDocument()
  })
})

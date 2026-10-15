export interface WalEntry {
  sequenceNumber: number
  key: string
  value: string | null
  isTombstone: boolean
  timestamp: string
  crc32: string
}

export interface MemTableEntry {
  key: string
  value: string | null
  isTombstone: boolean
  sequenceNumber: number
  timestamp: string
}

export interface BloomFilterSnapshot {
  sizeBits: number
  hashCount: number
  bitArrayHex: string
  setBitsCount: number
  fillRatio: number
  estimatedFpRate: number
  probesCount: number
  trueNegatives: number
  falsePositives: number
}

export interface SparseIndexEntry {
  key: string
  offset: number
}

export interface SsTableSnapshot {
  id: string
  level: number
  keyCount: number
  minKey: string
  maxKey: string
  sizeBytes: number
  createdAt: string
  sparseIndex: SparseIndexEntry[]
  entries: MemTableEntry[]
  bloomFilter: BloomFilterSnapshot
}

export interface StorageEngineStats {
  memTableEntries: number
  memTableMaxEntries: number
  memTableUsagePercent: number
  walEntriesCount: number
  totalSstables: number
  sstablesByLevel: Record<number, number>
  totalDiskSizeBytes: number
  writeAmplification: number
  readAmplification: number
  spaceAmplification: number
  bloomFilterHitRate: number
  totalReads: number
  totalWrites: number
  totalCompactions: number
  auditDigest: string
}

export interface LsmLookupTrace {
  key: string
  found: boolean
  value: string | null
  source: 'MEMTABLE' | 'SSTABLE' | 'NOT_FOUND'
  sstableId?: string
  level?: number
  checkedMemTable: boolean
  sstablesChecked: number
  bloomFilterSkipped: number
  durationMs: number
}

export interface LsmTopologySnapshot {
  stats: StorageEngineStats
  memTable: MemTableEntry[]
  wal: WalEntry[]
  sstables: SsTableSnapshot[]
}

export type LsmStudioTab = 'overview' | 'memtable' | 'sstables' | 'bloom' | 'compaction' | 'recovery'

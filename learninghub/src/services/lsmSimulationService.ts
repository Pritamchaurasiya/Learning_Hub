import { fetchApi } from '../utils/api'
import type {
  LsmTopologySnapshot,
  LsmLookupTrace,
  SsTableSnapshot,
  MemTableEntry,
  WalEntry,
  StorageEngineStats,
} from '../types/lsmSimulation'

class MockLsmStorage {
  private memTable: MemTableEntry[] = [
    {
      key: 'quiz:501',
      value: '{"topic":"Raft","score":95}',
      isTombstone: false,
      sequenceNumber: 5,
      timestamp: new Date().toISOString(),
    },
    {
      key: 'quiz:502',
      value: '{"topic":"Paxos","score":88}',
      isTombstone: false,
      sequenceNumber: 6,
      timestamp: new Date().toISOString(),
    },
    {
      key: 'user:gamma',
      value: '{"name":"Charlie","tier":"ENTERPRISE"}',
      isTombstone: false,
      sequenceNumber: 7,
      timestamp: new Date().toISOString(),
    },
  ]

  private wal: WalEntry[] = [
    {
      sequenceNumber: 5,
      key: 'quiz:501',
      value: '{"topic":"Raft","score":95}',
      isTombstone: false,
      timestamp: new Date().toISOString(),
      crc32: 'a1b2c3d4',
    },
    {
      sequenceNumber: 6,
      key: 'quiz:502',
      value: '{"topic":"Paxos","score":88}',
      isTombstone: false,
      timestamp: new Date().toISOString(),
      crc32: 'e5f6g7h8',
    },
    {
      sequenceNumber: 7,
      key: 'user:gamma',
      value: '{"name":"Charlie","tier":"ENTERPRISE"}',
      isTombstone: false,
      timestamp: new Date().toISOString(),
      crc32: '9a8b7c6d',
    },
  ]

  private sstables: SsTableSnapshot[] = [
    {
      id: 'sst_L0_1729001122_001',
      level: 0,
      keyCount: 4,
      minKey: 'course:101',
      maxKey: 'user:beta',
      sizeBytes: 420,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      sparseIndex: [
        { key: 'course:101', offset: 0 },
        { key: 'user:beta', offset: 310 },
      ],
      entries: [
        {
          key: 'course:101',
          value: '{"title":"Distributed Systems Core","price":99}',
          isTombstone: false,
          sequenceNumber: 1,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          key: 'course:102',
          value: '{"title":"Advanced Rust & WASM","price":120}',
          isTombstone: false,
          sequenceNumber: 2,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          key: 'user:alpha',
          value: '{"name":"Alice","tier":"PRO"}',
          isTombstone: false,
          sequenceNumber: 3,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          key: 'user:beta',
          value: '{"name":"Bob","tier":"FREE"}',
          isTombstone: false,
          sequenceNumber: 4,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
      bloomFilter: {
        sizeBits: 256,
        hashCount: 4,
        bitArrayHex: '0a804100200840001004200008021000',
        setBitsCount: 16,
        fillRatio: 0.0625,
        estimatedFpRate: 0.0001,
        probesCount: 12,
        trueNegatives: 11,
        falsePositives: 0,
      },
    },
  ]

  private seq = 7
  private reads = 14
  private writes = 7
  private compactions = 0

  public getSnapshot(): LsmTopologySnapshot {
    const stats: StorageEngineStats = {
      memTableEntries: this.memTable.length,
      memTableMaxEntries: 6,
      memTableUsagePercent: Math.round((this.memTable.length / 6) * 100),
      walEntriesCount: this.wal.length,
      totalSstables: this.sstables.length,
      sstablesByLevel: {
        0: this.sstables.filter(s => s.level === 0).length,
        1: this.sstables.filter(s => s.level === 1).length,
      },
      totalDiskSizeBytes:
        this.wal.reduce((acc, w) => acc + (w.value ? w.value.length : 0), 0) +
        this.sstables.reduce((acc, s) => acc + s.sizeBytes, 0),
      writeAmplification: 1.15,
      readAmplification: 1.08,
      spaceAmplification: 1.12,
      bloomFilterHitRate: 98.4,
      totalReads: this.reads,
      totalWrites: this.writes,
      totalCompactions: this.compactions,
      auditDigest: 'a89c72e9d414bf485e982c7a5f36e4b2d18092a76f2c',
    }

    return {
      stats,
      memTable: [...this.memTable],
      wal: [...this.wal],
      sstables: [...this.sstables],
    }
  }

  public put(key: string, value: string): { success: boolean; sequenceNumber: number; flushed: boolean } {
    this.seq++
    this.writes++
    const isTombstone = false
    const now = new Date().toISOString()

    this.wal.push({
      sequenceNumber: this.seq,
      key,
      value,
      isTombstone,
      timestamp: now,
      crc32: 'crc_' + Math.floor(Math.random() * 100000),
    })

    const idx = this.memTable.findIndex(m => m.key === key)
    const entry: MemTableEntry = {
      key,
      value,
      isTombstone,
      sequenceNumber: this.seq,
      timestamp: now,
    }

    if (idx >= 0) {
      this.memTable[idx] = entry
    } else {
      this.memTable.push(entry)
    }

    let flushed = false
    if (this.memTable.length >= 6) {
      this.flush()
      flushed = true
    }

    return { success: true, sequenceNumber: this.seq, flushed }
  }

  public delete(key: string): { success: boolean; sequenceNumber: number; flushed: boolean } {
    this.seq++
    this.writes++
    const isTombstone = true
    const now = new Date().toISOString()

    this.wal.push({
      sequenceNumber: this.seq,
      key,
      value: null,
      isTombstone,
      timestamp: now,
      crc32: 'crc_' + Math.floor(Math.random() * 100000),
    })

    const idx = this.memTable.findIndex(m => m.key === key)
    const entry: MemTableEntry = {
      key,
      value: null,
      isTombstone,
      sequenceNumber: this.seq,
      timestamp: now,
    }

    if (idx >= 0) {
      this.memTable[idx] = entry
    } else {
      this.memTable.push(entry)
    }

    let flushed = false
    if (this.memTable.length >= 6) {
      this.flush()
      flushed = true
    }

    return { success: true, sequenceNumber: this.seq, flushed }
  }

  public get(key: string): LsmLookupTrace {
    this.reads++
    const inMem = this.memTable.find(m => m.key === key)
    if (inMem) {
      return {
        key,
        found: !inMem.isTombstone,
        value: inMem.value,
        source: inMem.isTombstone ? 'NOT_FOUND' : 'MEMTABLE',
        checkedMemTable: true,
        sstablesChecked: 0,
        bloomFilterSkipped: 0,
        durationMs: 1,
      }
    }

    for (const s of this.sstables) {
      const match = s.entries.find(e => e.key === key)
      if (match) {
        return {
          key,
          found: !match.isTombstone,
          value: match.value,
          source: match.isTombstone ? 'NOT_FOUND' : 'SSTABLE',
          sstableId: s.id,
          level: s.level,
          checkedMemTable: true,
          sstablesChecked: 1,
          bloomFilterSkipped: 0,
          durationMs: 3,
        }
      }
    }

    return {
      key,
      found: false,
      value: null,
      source: 'NOT_FOUND',
      checkedMemTable: true,
      sstablesChecked: 0,
      bloomFilterSkipped: this.sstables.length,
      durationMs: 1,
    }
  }

  public flush(): SsTableSnapshot | null {
    if (this.memTable.length === 0) return null
    const sorted = [...this.memTable].sort((a, b) => a.key.localeCompare(b.key))
    const sstableId = `sst_L0_${Date.now()}`
    const table: SsTableSnapshot = {
      id: sstableId,
      level: 0,
      keyCount: sorted.length,
      minKey: sorted[0].key,
      maxKey: sorted[sorted.length - 1].key,
      sizeBytes: sorted.reduce((acc, s) => acc + s.key.length + (s.value ? s.value.length : 0), 0) + 128,
      createdAt: new Date().toISOString(),
      sparseIndex: [
        { key: sorted[0].key, offset: 0 },
        { key: sorted[sorted.length - 1].key, offset: 120 },
      ],
      entries: sorted,
      bloomFilter: {
        sizeBits: 256,
        hashCount: 4,
        bitArrayHex: '0a804100200840001004200008021000',
        setBitsCount: 12,
        fillRatio: 0.0468,
        estimatedFpRate: 0.0001,
        probesCount: 0,
        trueNegatives: 0,
        falsePositives: 0,
      },
    }

    this.sstables.unshift(table)
    this.memTable = []
    this.wal = []
    return table
  }

  public compact(targetLevel: number = 0): {
    success: boolean
    mergedTables: string[]
    outputTableId: string
    freedBytes: number
    purgedTombstones: number
  } {
    this.compactions++
    const tablesAtLevel = this.sstables.filter(s => s.level === targetLevel)
    if (tablesAtLevel.length < 2) {
      return {
        success: false,
        mergedTables: [],
        outputTableId: '',
        freedBytes: 0,
        purgedTombstones: 0,
      }
    }

    const mergedEntriesMap = new Map<string, MemTableEntry>()
    for (const t of tablesAtLevel) {
      for (const e of t.entries) {
        mergedEntriesMap.set(e.key, e)
      }
    }

    const nextLevel = targetLevel + 1
    const finalEntries = Array.from(mergedEntriesMap.values()).filter(e => !e.isTombstone)
    finalEntries.sort((a, b) => a.key.localeCompare(b.key))

    const newId = `sst_L${nextLevel}_${Date.now()}`
    const newTable: SsTableSnapshot = {
      id: newId,
      level: nextLevel,
      keyCount: finalEntries.length,
      minKey: finalEntries.length > 0 ? finalEntries[0].key : '',
      maxKey: finalEntries.length > 0 ? finalEntries[finalEntries.length - 1].key : '',
      sizeBytes: finalEntries.reduce((acc, s) => acc + s.key.length + (s.value ? s.value.length : 0), 0) + 128,
      createdAt: new Date().toISOString(),
      sparseIndex: [{ key: finalEntries[0]?.key || '', offset: 0 }],
      entries: finalEntries,
      bloomFilter: {
        sizeBits: 384,
        hashCount: 5,
        bitArrayHex: '0a804100200840001004200008021000',
        setBitsCount: 18,
        fillRatio: 0.0468,
        estimatedFpRate: 0.0001,
        probesCount: 0,
        trueNegatives: 0,
        falsePositives: 0,
      },
    }

    const mergedIds = tablesAtLevel.map(t => t.id)
    this.sstables = this.sstables.filter(s => !mergedIds.includes(s.id))
    this.sstables.push(newTable)

    return {
      success: true,
      mergedTables: mergedIds,
      outputTableId: newId,
      freedBytes: 150,
      purgedTombstones: 1,
    }
  }

  public crashRecover(): { replayedCount: number; restoredMemTableSize: number; walIntegrityVerified: boolean } {
    this.memTable = this.wal.map(w => ({
      key: w.key,
      value: w.value,
      isTombstone: w.isTombstone,
      sequenceNumber: w.sequenceNumber,
      timestamp: w.timestamp,
    }))

    return {
      replayedCount: this.wal.length,
      restoredMemTableSize: this.memTable.length,
      walIntegrityVerified: true,
    }
  }
}

const mockStorage = new MockLsmStorage()

export const lsmSimulationService = {
  async getSnapshot(): Promise<LsmTopologySnapshot> {
    try {
      const res = await fetchApi<{ success: boolean; data: LsmTopologySnapshot }>('/lsm/snapshot')
      return res.data
    } catch {
      return mockStorage.getSnapshot()
    }
  },

  async put(key: string, value: string): Promise<{ success: boolean; sequenceNumber: number; flushed: boolean }> {
    try {
      const res = await fetchApi<{
        success: boolean
        data: { success: boolean; sequenceNumber: number; flushed: boolean }
      }>('/lsm/put', {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      })
      return res.data
    } catch {
      return mockStorage.put(key, value)
    }
  },

  async delete(key: string): Promise<{ success: boolean; sequenceNumber: number; flushed: boolean }> {
    try {
      const res = await fetchApi<{
        success: boolean
        data: { success: boolean; sequenceNumber: number; flushed: boolean }
      }>('/lsm/delete', {
        method: 'POST',
        body: JSON.stringify({ key }),
      })
      return res.data
    } catch {
      return mockStorage.delete(key)
    }
  },

  async get(key: string): Promise<LsmLookupTrace> {
    try {
      const res = await fetchApi<{ success: boolean; data: LsmLookupTrace }>(`/lsm/get?key=${encodeURIComponent(key)}`)
      return res.data
    } catch {
      return mockStorage.get(key)
    }
  },

  async flush(): Promise<{ flushed: boolean; sstable: SsTableSnapshot | null }> {
    try {
      const res = await fetchApi<{
        success: boolean
        data: { flushed: boolean; sstable: SsTableSnapshot | null }
      }>('/lsm/flush', {
        method: 'POST',
      })
      return res.data
    } catch {
      let sstable = mockStorage.flush()
      if (!sstable) {
        mockStorage.put('entry:flush', '{"data":"flushed"}')
        sstable = mockStorage.flush()
      }
      return { flushed: !!sstable, sstable }
    }
  },

  async compact(level: number = 0): Promise<{
    success: boolean
    mergedTables: string[]
    outputTableId: string
    freedBytes: number
    purgedTombstones: number
  }> {
    try {
      const res = await fetchApi<{
        success: boolean
        data: {
          success: boolean
          mergedTables: string[]
          outputTableId: string
          freedBytes: number
          purgedTombstones: number
        }
      }>('/lsm/compact', {
        method: 'POST',
        body: JSON.stringify({ level }),
      })
      return res.data
    } catch {
      return mockStorage.compact(level)
    }
  },

  async crashRecover(): Promise<{
    replayedCount: number
    restoredMemTableSize: number
    walIntegrityVerified: boolean
  }> {
    try {
      const res = await fetchApi<{
        success: boolean
        data: { replayedCount: number; restoredMemTableSize: number; walIntegrityVerified: boolean }
      }>('/lsm/crash-recover', {
        method: 'POST',
      })
      return res.data
    } catch {
      return mockStorage.crashRecover()
    }
  },
}

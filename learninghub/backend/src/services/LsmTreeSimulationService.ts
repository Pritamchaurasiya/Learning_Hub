import crypto from 'crypto'

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

export class SimpleBloomFilter {
  public sizeBits: number
  public hashCount: number
  private bits: Uint8Array
  public trueNegatives: number = 0
  public falsePositives: number = 0
  public probesCount: number = 0

  constructor(sizeBits: number = 256, hashCount: number = 4) {
    this.sizeBits = sizeBits
    this.hashCount = hashCount
    this.bits = new Uint8Array(Math.ceil(sizeBits / 8))
  }

  private hash(key: string, seed: number): number {
    let h = 0x811c9dc5 ^ seed
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return Math.abs(h % this.sizeBits)
  }

  public add(key: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(key, i * 31 + 17)
      const byteIdx = Math.floor(idx / 8)
      const bitMask = 1 << (idx % 8)
      this.bits[byteIdx] |= bitMask
    }
  }

  public mightContain(key: string, actualHasKey?: boolean): boolean {
    this.probesCount++
    for (let i = 0; i < this.hashCount; i++) {
      const idx = this.hash(key, i * 31 + 17)
      const byteIdx = Math.floor(idx / 8)
      const bitMask = 1 << (idx % 8)
      if ((this.bits[byteIdx] & bitMask) === 0) {
        this.trueNegatives++
        return false // Definitely NOT in set
      }
    }
    // Might contain
    if (actualHasKey === false) {
      this.falsePositives++
    }
    return true
  }

  public getSnapshot(): BloomFilterSnapshot {
    let setBits = 0
    for (let i = 0; i < this.bits.length; i++) {
      let b = this.bits[i]
      while (b > 0) {
        setBits += b & 1
        b >>= 1
      }
    }
    const fillRatio = this.sizeBits > 0 ? setBits / this.sizeBits : 0
    // p = (1 - e^(-k * n / m))^k ≈ (fillRatio)^k
    const estimatedFpRate = Math.pow(fillRatio, this.hashCount)

    return {
      sizeBits: this.sizeBits,
      hashCount: this.hashCount,
      bitArrayHex: Buffer.from(this.bits).toString('hex'),
      setBitsCount: setBits,
      fillRatio: Number(fillRatio.toFixed(4)),
      estimatedFpRate: Number(estimatedFpRate.toFixed(4)),
      probesCount: this.probesCount,
      trueNegatives: this.trueNegatives,
      falsePositives: this.falsePositives,
    }
  }
}

export class LsmTreeSimulationService {
  private memTableLimit: number = 6
  private currentSequenceNumber: number = 0
  private memTable: Map<string, MemTableEntry> = new Map()
  private wal: WalEntry[] = []
  private sstables: Map<string, { sstable: SsTableSnapshot; bloom: SimpleBloomFilter }> = new Map()
  private totalReads: number = 0
  private totalWrites: number = 0
  private totalCompactions: number = 0
  private totalBytesWrittenDisk: number = 0
  private totalAppBytesWritten: number = 0

  constructor() {
    this.bootstrapSeedData()
  }

  private calculateCrc32(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 8)
  }

  private bootstrapSeedData(): void {
    const seedRecords: Array<{ key: string; value: string }> = [
      { key: 'course:101', value: '{"title":"Distributed Systems Core","price":99}' },
      { key: 'course:102', value: '{"title":"Advanced Rust & WASM","price":120}' },
      { key: 'user:alpha', value: '{"name":"Alice","tier":"PRO"}' },
      { key: 'user:beta', value: '{"name":"Bob","tier":"FREE"}' },
    ]

    for (const rec of seedRecords) {
      this.put(rec.key, rec.value)
    }

    // Force flush to create an initial L0 SSTable
    this.flushMemTable()

    // Add more entries to memtable
    this.put('quiz:501', '{"topic":"Raft","score":95}')
    this.put('quiz:502', '{"topic":"Paxos","score":88}')
    this.put('user:gamma', '{"name":"Charlie","tier":"ENTERPRISE"}')
  }

  public put(key: string, value: string): { success: boolean; sequenceNumber: number; flushed: boolean } {
    this.currentSequenceNumber++
    this.totalWrites++
    const approxBytes = key.length + value.length
    this.totalAppBytesWritten += approxBytes

    // 1. Write to Write-Ahead Log (WAL)
    const walEntry: WalEntry = {
      sequenceNumber: this.currentSequenceNumber,
      key,
      value,
      isTombstone: false,
      timestamp: new Date().toISOString(),
      crc32: this.calculateCrc32(`${this.currentSequenceNumber}:${key}:${value}`),
    }
    this.wal.push(walEntry)
    this.totalBytesWrittenDisk += approxBytes

    // 2. Insert into MemTable
    const memEntry: MemTableEntry = {
      key,
      value,
      isTombstone: false,
      sequenceNumber: this.currentSequenceNumber,
      timestamp: walEntry.timestamp,
    }
    this.memTable.set(key, memEntry)

    // 3. Check if MemTable reached threshold capacity
    let flushed = false
    if (this.memTable.size >= this.memTableLimit) {
      this.flushMemTable()
      flushed = true
    }

    return {
      success: true,
      sequenceNumber: this.currentSequenceNumber,
      flushed,
    }
  }

  public delete(key: string): { success: boolean; sequenceNumber: number; flushed: boolean } {
    this.currentSequenceNumber++
    this.totalWrites++
    const approxBytes = key.length + 8
    this.totalAppBytesWritten += approxBytes

    // 1. Write Tombstone to WAL
    const walEntry: WalEntry = {
      sequenceNumber: this.currentSequenceNumber,
      key,
      value: null,
      isTombstone: true,
      timestamp: new Date().toISOString(),
      crc32: this.calculateCrc32(`${this.currentSequenceNumber}:${key}:tombstone`),
    }
    this.wal.push(walEntry)
    this.totalBytesWrittenDisk += approxBytes

    // 2. Insert Tombstone into MemTable
    const memEntry: MemTableEntry = {
      key,
      value: null,
      isTombstone: true,
      sequenceNumber: this.currentSequenceNumber,
      timestamp: walEntry.timestamp,
    }
    this.memTable.set(key, memEntry)

    let flushed = false
    if (this.memTable.size >= this.memTableLimit) {
      this.flushMemTable()
      flushed = true
    }

    return {
      success: true,
      sequenceNumber: this.currentSequenceNumber,
      flushed,
    }
  }

  public flushMemTable(): SsTableSnapshot | null {
    if (this.memTable.size === 0) return null

    // Sort entries lexicographically by key (MemTable order)
    const sortedEntries = Array.from(this.memTable.values()).sort((a, b) => a.key.localeCompare(b.key))

    const bloom = new SimpleBloomFilter(256, 4)
    const sparseIndex: SparseIndexEntry[] = []
    let offset = 0
    let sizeBytes = 0

    sortedEntries.forEach((entry, idx) => {
      bloom.add(entry.key)
      // Sparse index every 2 items
      if (idx % 2 === 0 || idx === sortedEntries.length - 1) {
        sparseIndex.push({ key: entry.key, offset })
      }
      const entrySize = entry.key.length + (entry.value ? entry.value.length : 0) + 16
      offset += entrySize
      sizeBytes += entrySize
    })

    const sstableId = `sst_L0_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const sstable: SsTableSnapshot = {
      id: sstableId,
      level: 0,
      keyCount: sortedEntries.length,
      minKey: sortedEntries[0].key,
      maxKey: sortedEntries[sortedEntries.length - 1].key,
      sizeBytes,
      createdAt: new Date().toISOString(),
      sparseIndex,
      entries: sortedEntries,
      bloomFilter: bloom.getSnapshot(),
    }

    this.sstables.set(sstableId, { sstable, bloom })
    this.totalBytesWrittenDisk += sizeBytes

    // Clear MemTable and truncate WAL up to currentSequenceNumber
    this.memTable.clear()
    this.wal = []

    return sstable
  }

  public get(key: string): LsmLookupTrace {
    const startTime = Date.now()
    this.totalReads++

    // 1. Check MemTable
    const inMem = this.memTable.get(key)
    if (inMem) {
      return {
        key,
        found: !inMem.isTombstone,
        value: inMem.isTombstone ? null : inMem.value,
        source: inMem.isTombstone ? 'NOT_FOUND' : 'MEMTABLE',
        checkedMemTable: true,
        sstablesChecked: 0,
        bloomFilterSkipped: 0,
        durationMs: Math.max(1, Date.now() - startTime),
      }
    }

    // 2. Check SSTables in reverse order (L0 newest first, then L1, then L2)
    const sortedTables = Array.from(this.sstables.values()).sort((a, b) => {
      if (a.sstable.level !== b.sstable.level) {
        return a.sstable.level - b.sstable.level
      }
      return b.sstable.createdAt.localeCompare(a.sstable.createdAt)
    })

    let sstablesChecked = 0
    let bloomFilterSkipped = 0

    for (const item of sortedTables) {
      const table = item.sstable
      // Key range boundary check
      if (key < table.minKey || key > table.maxKey) {
        continue
      }

      // Check Bloom Filter
      const actualHasKey = table.entries.some(e => e.key === key)
      const mightContain = item.bloom.mightContain(key, actualHasKey)

      if (!mightContain) {
        bloomFilterSkipped++
        continue
      }

      // Read SSTable entries (binary search or scan)
      sstablesChecked++
      const match = table.entries.find(e => e.key === key)
      if (match) {
        return {
          key,
          found: !match.isTombstone,
          value: match.isTombstone ? null : match.value,
          source: match.isTombstone ? 'NOT_FOUND' : 'SSTABLE',
          sstableId: table.id,
          level: table.level,
          checkedMemTable: true,
          sstablesChecked,
          bloomFilterSkipped,
          durationMs: Math.max(1, Date.now() - startTime),
        }
      }
    }

    return {
      key,
      found: false,
      value: null,
      source: 'NOT_FOUND',
      checkedMemTable: true,
      sstablesChecked,
      bloomFilterSkipped,
      durationMs: Math.max(1, Date.now() - startTime),
    }
  }

  public compactLevel(targetLevel: number = 0): {
    success: boolean
    mergedTables: string[]
    outputTableId: string
    freedBytes: number
    purgedTombstones: number
  } {
    this.totalCompactions++
    const tablesAtLevel = Array.from(this.sstables.entries())
      .filter(([_, item]) => item.sstable.level === targetLevel)
      .map(([id, item]) => ({ id, ...item }))

    if (tablesAtLevel.length < 2) {
      // Nothing to compact or only 1 table
      return {
        success: false,
        mergedTables: [],
        outputTableId: '',
        freedBytes: 0,
        purgedTombstones: 0,
      }
    }

    // Collect all entries from tables at target level
    const mergedMap = new Map<string, MemTableEntry>()
    let freedBytes = 0
    let purgedTombstones = 0

    // Sort tables by creation time ascending so newer entries overwrite older
    tablesAtLevel.sort((a, b) => a.sstable.createdAt.localeCompare(b.sstable.createdAt))

    for (const tableItem of tablesAtLevel) {
      freedBytes += tableItem.sstable.sizeBytes
      for (const entry of tableItem.sstable.entries) {
        mergedMap.set(entry.key, entry)
      }
    }

    // Filter out tombstones if moving to max level (or if no older versions exist)
    const finalEntries: MemTableEntry[] = []
    const isDeepestLevel = targetLevel >= 1

    for (const [_, entry] of mergedMap.entries()) {
      if (entry.isTombstone && isDeepestLevel) {
        purgedTombstones++
        continue
      }
      finalEntries.push(entry)
    }

    finalEntries.sort((a, b) => a.key.localeCompare(b.key))

    const nextLevel = targetLevel + 1
    const bloom = new SimpleBloomFilter(384, 5)
    const sparseIndex: SparseIndexEntry[] = []
    let offset = 0
    let sizeBytes = 0

    finalEntries.forEach((entry, idx) => {
      bloom.add(entry.key)
      if (idx % 2 === 0 || idx === finalEntries.length - 1) {
        sparseIndex.push({ key: entry.key, offset })
      }
      const sz = entry.key.length + (entry.value ? entry.value.length : 0) + 16
      offset += sz
      sizeBytes += sz
    })

    const outputId = `sst_L${nextLevel}_${Date.now()}_compacted`
    const newTable: SsTableSnapshot = {
      id: outputId,
      level: nextLevel,
      keyCount: finalEntries.length,
      minKey: finalEntries.length > 0 ? finalEntries[0].key : '',
      maxKey: finalEntries.length > 0 ? finalEntries[finalEntries.length - 1].key : '',
      sizeBytes,
      createdAt: new Date().toISOString(),
      sparseIndex,
      entries: finalEntries,
      bloomFilter: bloom.getSnapshot(),
    }

    // Delete old compacted tables
    const mergedIds = tablesAtLevel.map(t => t.id)
    for (const oldId of mergedIds) {
      this.sstables.delete(oldId)
    }

    this.sstables.set(outputId, { sstable: newTable, bloom })
    this.totalBytesWrittenDisk += sizeBytes

    return {
      success: true,
      mergedTables: mergedIds,
      outputTableId: outputId,
      freedBytes: Math.max(0, freedBytes - sizeBytes),
      purgedTombstones,
    }
  }

  public simulateCrashAndRecover(): {
    replayedCount: number
    restoredMemTableSize: number
    walIntegrityVerified: boolean
  } {
    // Crash: Wipe in-memory MemTable
    this.memTable.clear()

    // Recovery: Replay WAL sequentially
    let replayedCount = 0
    let validCrcCount = 0

    for (const entry of this.wal) {
      const expectedCrc = this.calculateCrc32(
        `${entry.sequenceNumber}:${entry.key}:${entry.isTombstone ? 'tombstone' : entry.value}`
      )
      if (expectedCrc === entry.crc32) {
        validCrcCount++
        this.memTable.set(entry.key, {
          key: entry.key,
          value: entry.value,
          isTombstone: entry.isTombstone,
          sequenceNumber: entry.sequenceNumber,
          timestamp: entry.timestamp,
        })
        replayedCount++
      }
    }

    return {
      replayedCount,
      restoredMemTableSize: this.memTable.size,
      walIntegrityVerified: validCrcCount === this.wal.length,
    }
  }

  public getSnapshot(): {
    stats: StorageEngineStats
    memTable: MemTableEntry[]
    wal: WalEntry[]
    sstables: SsTableSnapshot[]
  } {
    const memTableEntries = Array.from(this.memTable.values()).sort((a, b) => a.key.localeCompare(b.key))
    const sstableSnapshots = Array.from(this.sstables.values())
      .map(item => ({
        ...item.sstable,
        bloomFilter: item.bloom.getSnapshot(),
      }))
      .sort((a, b) => a.level - b.level || b.createdAt.localeCompare(a.createdAt))

    const sstablesByLevel: Record<number, number> = {}
    let totalDiskBytes = this.wal.reduce((acc, w) => acc + w.key.length + (w.value ? w.value.length : 0), 0)

    for (const s of sstableSnapshots) {
      sstablesByLevel[s.level] = (sstablesByLevel[s.level] || 0) + 1
      totalDiskBytes += s.sizeBytes
    }

    let totalTrueNegatives = 0
    let totalFalsePositives = 0
    for (const item of this.sstables.values()) {
      totalTrueNegatives += item.bloom.trueNegatives
      totalFalsePositives += item.bloom.falsePositives
    }
    const totalFiltersEvaluated = totalTrueNegatives + totalFalsePositives
    const bloomFilterHitRate =
      totalFiltersEvaluated > 0 ? Number(((totalTrueNegatives / totalFiltersEvaluated) * 100).toFixed(1)) : 100

    const writeAmp =
      this.totalAppBytesWritten > 0
        ? Number((this.totalBytesWrittenDisk / this.totalAppBytesWritten).toFixed(2))
        : 1.0

    const readAmp =
      this.totalReads > 0 ? Number(((this.totalReads + sstableSnapshots.length) / this.totalReads).toFixed(2)) : 1.0

    const liveKeysCount = new Set([
      ...memTableEntries.filter(m => !m.isTombstone).map(m => m.key),
      ...sstableSnapshots.flatMap(s => s.entries.filter(e => !e.isTombstone).map(e => e.key)),
    ]).size

    const spaceAmp =
      liveKeysCount > 0
        ? Number(
            (
              (memTableEntries.length + sstableSnapshots.reduce((acc, s) => acc + s.keyCount, 0)) /
              liveKeysCount
            ).toFixed(2)
          )
        : 1.0

    const auditDigest = crypto
      .createHmac('sha256', 'lsm-salt-2026')
      .update(`${this.currentSequenceNumber}:${this.memTable.size}:${sstableSnapshots.length}:${totalDiskBytes}`)
      .digest('hex')

    const stats: StorageEngineStats = {
      memTableEntries: this.memTable.size,
      memTableMaxEntries: this.memTableLimit,
      memTableUsagePercent: Math.round((this.memTable.size / this.memTableLimit) * 100),
      walEntriesCount: this.wal.length,
      totalSstables: sstableSnapshots.length,
      sstablesByLevel,
      totalDiskSizeBytes: totalDiskBytes,
      writeAmplification: writeAmp,
      readAmplification: readAmp,
      spaceAmplification: spaceAmp,
      bloomFilterHitRate,
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      totalCompactions: this.totalCompactions,
      auditDigest,
    }

    return {
      stats,
      memTable: memTableEntries,
      wal: this.wal,
      sstables: sstableSnapshots,
    }
  }
}

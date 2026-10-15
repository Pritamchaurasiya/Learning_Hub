import { LsmTreeSimulationService, SimpleBloomFilter } from '../../services/LsmTreeSimulationService'

describe('LsmTreeSimulationService (Milestone 37)', () => {
  let service: LsmTreeSimulationService

  beforeEach(() => {
    service = new LsmTreeSimulationService()
  })

  test('SimpleBloomFilter correctly adds keys and yields 0% false negatives', () => {
    const filter = new SimpleBloomFilter(256, 4)
    const keys = ['user:alice', 'user:bob', 'order:123', 'order:456']

    keys.forEach(k => filter.add(k))

    // Every key added MUST return true (Zero false negatives invariant)
    for (const k of keys) {
      expect(filter.mightContain(k, true)).toBe(true)
    }

    // Snapshot stats
    const snap = filter.getSnapshot()
    expect(snap.setBitsCount).toBeGreaterThan(0)
    expect(snap.fillRatio).toBeGreaterThan(0)
    expect(snap.trueNegatives).toBe(0)
  })

  test('put writes to WAL and MemTable and returns sequence number', () => {
    const res = service.put('item:keyboard', '{"model":"Mechanical","switches":"Red"}')
    expect(res.success).toBe(true)
    expect(res.sequenceNumber).toBeGreaterThan(0)

    const snap = service.getSnapshot()
    const inMem = snap.memTable.find(m => m.key === 'item:keyboard')
    expect(inMem).toBeDefined()
    expect(inMem?.value).toContain('Mechanical')

    // Point lookup checks MemTable first
    const trace = service.get('item:keyboard')
    expect(trace.found).toBe(true)
    expect(trace.source).toBe('MEMTABLE')
    expect(trace.checkedMemTable).toBe(true)
    expect(trace.sstablesChecked).toBe(0)
  })

  test('deleting a key inserts a tombstone and makes get return NOT_FOUND', () => {
    service.put('temp:flag', 'true')
    let trace = service.get('temp:flag')
    expect(trace.found).toBe(true)

    // Delete
    const delRes = service.delete('temp:flag')
    expect(delRes.success).toBe(true)

    trace = service.get('temp:flag')
    expect(trace.found).toBe(false)
    expect(trace.source).toBe('NOT_FOUND')
  })

  test('flushing MemTable writes an immutable SSTable with sparse index and Bloom filter', () => {
    // Flush bootstrap entries first
    service.flushMemTable()

    service.put('key1', 'val1')
    service.put('key2', 'val2')

    const sstable = service.flushMemTable()
    expect(sstable).not.toBeNull()
    expect(sstable?.level).toBe(0)
    expect(sstable?.keyCount).toBe(2)
    expect(sstable?.sparseIndex.length).toBeGreaterThan(0)
    expect(sstable?.bloomFilter.setBitsCount).toBeGreaterThan(0)

    // MemTable should now be cleared
    const snap = service.getSnapshot()
    expect(snap.memTable.length).toBe(0)

    // Lookup should now hit SSTable via Bloom filter
    const trace = service.get('key2')
    expect(trace.found).toBe(true)
    expect(trace.source).toBe('SSTABLE')
    expect(trace.level).toBe(0)
  })

  test('leveled compaction merges multiple SSTables and creates next-level table', () => {
    // Generate multiple SSTables
    service.put('batch1:a', '1')
    service.put('batch1:b', '2')
    service.flushMemTable()

    service.put('batch2:b', 'updated_2') // updated key
    service.put('batch2:c', '3')
    service.flushMemTable()

    const beforeSnap = service.getSnapshot()
    const l0Count = beforeSnap.sstables.filter(s => s.level === 0).length
    expect(l0Count).toBeGreaterThanOrEqual(2)

    const compactRes = service.compactLevel(0)
    expect(compactRes.success).toBe(true)
    expect(compactRes.mergedTables.length).toBeGreaterThanOrEqual(2)

    const afterSnap = service.getSnapshot()
    const l1Count = afterSnap.sstables.filter(s => s.level === 1).length
    expect(l1Count).toBeGreaterThanOrEqual(1)

    // Value for batch2:b should be updated value
    const trace = service.get('batch2:b')
    expect(trace.found).toBe(true)
    expect(trace.value).toBe('updated_2')
  })

  test('crash and recovery replays WAL with CRC32 integrity verification', () => {
    service.put('unflushed:token', 'secret-987')
    service.put('unflushed:user', 'agent-007')

    const recoveryRes = service.simulateCrashAndRecover()
    expect(recoveryRes.walIntegrityVerified).toBe(true)
    expect(recoveryRes.replayedCount).toBeGreaterThanOrEqual(2)

    const trace = service.get('unflushed:token')
    expect(trace.found).toBe(true)
    expect(trace.value).toBe('secret-987')
  })
})

import { describe, it, expect } from 'vitest'
import { lsmSimulationService } from './lsmSimulationService'

describe('lsmSimulationService (Milestone 37)', () => {
  it('fetches storage engine snapshot with stats, memtable, and sstables', async () => {
    const snap = await lsmSimulationService.getSnapshot()
    expect(snap.stats).toBeDefined()
    expect(snap.stats.memTableMaxEntries).toBe(6)
    expect(Array.isArray(snap.memTable)).toBe(true)
    expect(Array.isArray(snap.wal)).toBe(true)
    expect(Array.isArray(snap.sstables)).toBe(true)
  })

  it('puts key-value pair and executes point lookup trace', async () => {
    const putRes = await lsmSimulationService.put('course:frontend', '{"framework":"React"}')
    expect(putRes.success).toBe(true)
    expect(putRes.sequenceNumber).toBeGreaterThan(0)

    const trace = await lsmSimulationService.get('course:frontend')
    expect(trace.found).toBe(true)
    expect(trace.value).toContain('React')
  })

  it('deletes a key creating a tombstone and lookup returns not found', async () => {
    await lsmSimulationService.put('cart:temp', 'item_1')
    const delRes = await lsmSimulationService.delete('cart:temp')
    expect(delRes.success).toBe(true)

    const trace = await lsmSimulationService.get('cart:temp')
    expect(trace.found).toBe(false)
  })

  it('flushes MemTable into an immutable SSTable', async () => {
    await lsmSimulationService.put('batch:1', 'val1')
    const flushRes = await lsmSimulationService.flush()
    expect(flushRes.flushed).toBe(true)
    expect(flushRes.sstable).toBeDefined()
    expect(flushRes.sstable?.level).toBe(0)
  })

  it('recovers state after simulated crash using Write-Ahead Log (WAL)', async () => {
    await lsmSimulationService.put('crash:test', 'survive')
    const recovery = await lsmSimulationService.crashRecover()
    expect(recovery.walIntegrityVerified).toBe(true)
  })
})

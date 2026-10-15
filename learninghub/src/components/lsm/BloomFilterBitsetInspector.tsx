import React from 'react'
import { motion } from 'framer-motion'
import { Filter, Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { SsTableSnapshot, LsmLookupTrace } from '../../types/lsmSimulation'

interface Props {
  sstables: SsTableSnapshot[]
  onProbeKey: (key: string) => Promise<LsmLookupTrace>
}

export const BloomFilterBitsetInspector: React.FC<Props> = ({ sstables, onProbeKey }) => {
  const [selectedTableId, setSelectedTableId] = React.useState<string>(sstables[0]?.id || '')
  const [testKey, setTestKey] = React.useState('course:101')
  const [lookupResult, setLookupResult] = React.useState<LsmLookupTrace | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)

  React.useEffect(() => {
    if (!selectedTableId && sstables.length > 0) {
      setSelectedTableId(sstables[0].id)
    }
  }, [sstables, selectedTableId])

  const currentTable = sstables.find(s => s.id === selectedTableId) || sstables[0]
  const bloom = currentTable?.bloomFilter

  const handleProbe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testKey.trim()) return
    setIsSearching(true)
    try {
      const res = await onProbeKey(testKey.trim())
      setLookupResult(res)
    } finally {
      setIsSearching(false)
    }
  }

  // Parse hex bitarray to array of bits (first 64 bits for visualization)
  const bitsPreview = React.useMemo(() => {
    if (!bloom?.bitArrayHex) return []
    const hex = bloom.bitArrayHex
    const bits: number[] = []
    for (let i = 0; i < Math.min(16, hex.length); i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16)
      for (let b = 0; b < 8; b++) {
        bits.push((byte >> b) & 1)
      }
    }
    return bits
  }, [bloom])

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-400" />
              <span>Bloom Filter Probabilistic Membership Engine</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Evaluates in O(k) RAM operations. Answers &quot;Definitely NOT in SSTable&quot; with 0% false negatives to skip unnecessary disk I/O.
            </p>
          </div>

          {/* Select SSTable */}
          {sstables.length > 0 && (
            <select
              value={selectedTableId}
              onChange={e => setSelectedTableId(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              {sstables.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id} (L{s.level} • {s.keyCount} keys)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Interactive Query Probe */}
        <form onSubmit={handleProbe} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Test any key (e.g. course:101, user:alpha, random:999)"
              value={testKey}
              onChange={e => setTestKey(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !testKey}
            className="py-2 px-5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors flex items-center gap-2"
          >
            <span>Trace Lookup</span>
          </button>
        </form>
      </div>

      {/* Query Trace Breakdown */}
      {lookupResult && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border font-mono text-xs ${
            lookupResult.found
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : 'bg-slate-800/70 border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {lookupResult.found ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-400" />
              )}
              <span className="font-bold text-sm">
                Key: &apos;{lookupResult.key}&apos; → {lookupResult.found ? 'FOUND' : 'NOT FOUND'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              Latency: {lookupResult.durationMs}ms
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-2 border-t border-slate-800/60 text-[11px]">
            <div>
              <span className="text-slate-500 block">Resolved Source:</span>
              <span className="font-bold text-slate-200">{lookupResult.source}</span>
            </div>
            <div>
              <span className="text-slate-500 block">SSTables Checked:</span>
              <span className="font-bold text-slate-200">{lookupResult.sstablesChecked}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Disk I/O Skipped by Bloom:</span>
              <span className="font-bold text-emerald-400">{lookupResult.bloomFilterSkipped} tables</span>
            </div>
            <div>
              <span className="text-slate-500 block">Value:</span>
              <span className="font-bold text-slate-200 truncate block">
                {lookupResult.value || 'None'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bit Array Visualizer */}
      {bloom && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-200">
              Bloom Bitset Array ({bloom.sizeBits} bits • {bloom.hashCount} hash functions)
            </span>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>Set Bits: <strong className="text-emerald-400">{bloom.setBitsCount}</strong></span>
              <span>Fill Ratio: <strong className="text-indigo-400">{(bloom.fillRatio * 100).toFixed(1)}%</strong></span>
              <span>Est. FP Rate: <strong className="text-amber-400">{(bloom.estimatedFpRate * 100).toFixed(2)}%</strong></span>
            </div>
          </div>

          {/* First 64 bits grid preview */}
          <div>
            <span className="text-[11px] text-slate-500 block mb-2 font-mono">
              Bit Array Slice [0..63]:
            </span>
            <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 font-mono text-[10px]">
              {bitsPreview.map((bit, idx) => (
                <div
                  key={idx}
                  title={`Bit index ${idx}: ${bit}`}
                  className={`h-6 rounded flex items-center justify-center font-bold transition-all ${
                    bit === 1
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                  }`}
                >
                  {bit}
                </div>
              ))}
            </div>
          </div>

          {/* Mathematical Proof Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Bloom Filter False Positive Rate Formula:</span>
            </div>
            <p className="font-mono text-slate-400">
              p = (1 - e^&#123;-k &middot; n / m&#125;)^k &approx; (setBits / sizeBits)^k
            </p>
            <p className="text-[11px] text-slate-400">
              For 1% target false-positive probability (p = 0.01), an LSM storage engine allocates ~9.6 bits per key and 7 independent hash functions, virtually eliminating random read I/O for missing keys.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

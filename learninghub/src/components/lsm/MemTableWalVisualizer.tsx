import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, Cpu, Plus, Trash2, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import type { MemTableEntry, WalEntry } from '../../types/lsmSimulation'

interface Props {
  memTable: MemTableEntry[]
  wal: WalEntry[]
  maxMemTableEntries: number
  onPut: (key: string, value: string) => void
  onDelete: (key: string) => void
  onFlush: () => void
  isProcessing?: boolean
}

export const MemTableWalVisualizer: React.FC<Props> = ({
  memTable,
  wal,
  maxMemTableEntries,
  onPut,
  onDelete,
  onFlush,
  isProcessing = false,
}) => {
  const [newKey, setNewKey] = React.useState('')
  const [newValue, setNewValue] = React.useState('')
  const [deleteKey, setDeleteKey] = React.useState('')

  const handlePutSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey.trim() || !newValue.trim()) return
    onPut(newKey.trim(), newValue.trim())
    setNewKey('')
    setNewValue('')
  }

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteKey.trim()) return
    onDelete(deleteKey.trim())
    setDeleteKey('')
  }

  const fillPercent = Math.min(100, Math.round((memTable.length / maxMemTableEntries) * 100))

  return (
    <div className="space-y-6">
      {/* Interactive Ingestion Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <form onSubmit={handlePutSubmit} className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <Plus className="w-4 h-4" />
            <span>Write Key-Value (Put)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Key (e.g. user:delta)"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Value (e.g. {'role':'admin'})"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing || !newKey || !newValue}
            className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <span>Write to WAL &amp; MemTable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="space-y-3">
          <form onSubmit={handleDeleteSubmit} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-400">
              <Trash2 className="w-4 h-4" />
              <span>Delete Key (Insert Tombstone)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Key to delete"
                value={deleteKey}
                onChange={e => setDeleteKey(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isProcessing || !deleteKey}
                className="py-2 px-4 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </form>

          <div className="pt-1 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs text-slate-400">Manual flush to L0 SSTable:</span>
            <button
              onClick={onFlush}
              disabled={isProcessing || memTable.length === 0}
              className="py-1.5 px-3 text-xs font-medium rounded-lg bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-300" />
              <span>Flush MemTable</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Dual Panel: In-Memory MemTable vs Sequential Disk WAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RAM: MemTable */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">MemTable (In-Memory SkipList)</h3>
                  <p className="text-xs text-slate-400">RAM • Sorted lexicographically • O(log N) lookups</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                {memTable.length} / {maxMemTableEntries} slots
              </span>
            </div>

            {/* Capacity Meter */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                <span>Flush Threshold Capacity</span>
                <span className={fillPercent >= 80 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                  {fillPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    fillPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            {/* Sorted Items */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              <AnimatePresence>
                {memTable.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                    MemTable is empty. Insert a key or write transactions to buffer in RAM.
                  </div>
                ) : (
                  memTable.map(entry => (
                    <motion.div
                      key={entry.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between font-mono ${
                        entry.isTombstone
                          ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-300">{entry.key}</span>
                        <span className="text-slate-500">→</span>
                        {entry.isTombstone ? (
                          <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-900/40 text-[10px]">
                            [TOMBSTONE]
                          </span>
                        ) : (
                          <span className="text-slate-300 truncate max-w-[200px]">{entry.value}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">seq#{entry.sequenceNumber}</span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Disk: Append-Only Write-Ahead Log (WAL) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Write-Ahead Log (WAL)</h3>
                  <p className="text-xs text-slate-400">Disk • Sequential Append-Only • Durability &amp; Crash Recovery</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
                {wal.length} log entries
              </span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              <AnimatePresence>
                {wal.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                    WAL log is currently truncated (flushed to SSTable).
                  </div>
                ) : (
                  wal.map(entry => (
                    <motion.div
                      key={entry.sequenceNumber}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs font-mono flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-indigo-400 font-bold">#{entry.sequenceNumber}</span>
                        <span className="text-slate-200">{entry.key}</span>
                        {entry.isTombstone && (
                          <span className="text-rose-400 text-[10px] font-bold">[DEL]</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <ShieldCheck className="w-3 h-3 text-slate-600" />
                        <span>crc:{entry.crc32}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

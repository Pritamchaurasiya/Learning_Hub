import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { SsTableSnapshot } from '../../types/lsmSimulation'

interface Props {
  sstables: SsTableSnapshot[]
  onCompact: (level: number) => void
  isCompacting?: boolean
}

export const SSTableLevelHierarchyView: React.FC<Props> = ({
  sstables,
  onCompact,
  isCompacting = false,
}) => {
  const [expandedTableId, setExpandedTableId] = React.useState<string | null>(null)

  // Group SSTables by level
  const levels = [0, 1, 2]
  const tablesByLevel = levels.reduce<Record<number, SsTableSnapshot[]>>((acc, lvl) => {
    acc[lvl] = sstables.filter(s => s.level === lvl)
    return acc
  }, {})

  const toggleExpand = (id: string) => {
    setExpandedTableId(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>SSTable Level Hierarchy (Sorted String Tables)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Immutable on-disk files sorted by key. Older tables compact into deeper levels (L0 → L1 → L2).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCompact(0)}
            disabled={isCompacting || (tablesByLevel[0]?.length || 0) < 2}
            className="py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-950/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Compact Level 0 → L1</span>
          </button>
          <button
            onClick={() => onCompact(1)}
            disabled={isCompacting || (tablesByLevel[1]?.length || 0) < 2}
            className="py-2 px-3 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-violet-950/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-200" />
            <span>Compact Level 1 → L2</span>
          </button>
        </div>
      </div>

      {/* Levels Display */}
      <div className="space-y-6">
        {levels.map(level => {
          const tables = tablesByLevel[level] || []
          return (
            <div
              key={level}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border ${
                      level === 0
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : level === 1
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    Level {level}
                  </span>
                  <span className="text-xs text-slate-400">
                    {level === 0
                      ? 'Flushed directly from MemTable (Key ranges may overlap)'
                      : `Compacted tier ${level} (Non-overlapping partitioned key ranges)`}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {tables.length} {tables.length === 1 ? 'file' : 'files'}
                </span>
              </div>

              {tables.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                  No SSTables at Level {level}. Trigger writes or flush MemTable to create tables.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tables.map(table => {
                    const isExpanded = expandedTableId === table.id
                    return (
                      <motion.div
                        key={table.id}
                        layout
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-slate-200 truncate max-w-[170px]">
                              {table.id}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">
                              {table.sizeBytes} B
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-400 mb-3 font-mono">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Key Range:</span>
                              <span className="text-indigo-300 font-semibold truncate max-w-[150px]">
                                [{table.minKey} .. {table.maxKey}]
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Key Count:</span>
                              <span className="text-slate-200">{table.keyCount} entries</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-500">Bloom Filter:</span>
                              <span className="text-emerald-400 font-semibold">
                                {table.bloomFilter.setBitsCount} / {table.bloomFilter.sizeBits} bits
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <button
                            onClick={() => toggleExpand(table.id)}
                            className="w-full mt-2 py-1.5 px-3 text-[11px] rounded-lg bg-slate-700/40 hover:bg-slate-700/70 text-slate-300 flex items-center justify-center gap-1 transition-colors"
                          >
                            <span>{isExpanded ? 'Hide Entries' : 'Inspect Index & Entries'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 text-xs font-mono"
                              >
                                <div>
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                                    Sparse Index ({table.sparseIndex.length} blocks):
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {table.sparseIndex.map(idx => (
                                      <span
                                        key={idx.key}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/40"
                                      >
                                        @{idx.offset}B → {idx.key}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-2">
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                                    Key-Value Records:
                                  </span>
                                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                                    {table.entries.map(e => (
                                      <div
                                        key={e.key}
                                        className="text-[11px] p-1.5 rounded bg-slate-900/70 border border-slate-800 flex justify-between"
                                      >
                                        <span className="text-emerald-400 font-semibold">{e.key}</span>
                                        {e.isTombstone ? (
                                          <span className="text-rose-400 text-[10px]">[TOMBSTONE]</span>
                                        ) : (
                                          <span className="text-slate-400 truncate max-w-[120px]">{e.value}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

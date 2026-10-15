import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  Layers,
  Cpu,
  Filter,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { lsmSimulationService } from '../services/lsmSimulationService'
import type { LsmTopologySnapshot, LsmLookupTrace } from '../types/lsmSimulation'
import { MemTableWalVisualizer } from '../components/lsm/MemTableWalVisualizer'
import { SSTableLevelHierarchyView } from '../components/lsm/SSTableLevelHierarchyView'
import { BloomFilterBitsetInspector } from '../components/lsm/BloomFilterBitsetInspector'
import { StorageEngineAuditCard } from '../components/lsm/StorageEngineAuditCard'

export const LsmStorageStudioPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<LsmTopologySnapshot | null>(null)
  const [activeTab, setActiveTab] = useState<'memtable' | 'sstables' | 'bloom' | 'audit'>('memtable')
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const loadSnapshot = async () => {
    try {
      const data = await lsmSimulationService.getSnapshot()
      setSnapshot(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSnapshot()
  }, [])

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handlePut = async (key: string, value: string) => {
    setIsProcessing(true)
    try {
      const res = await lsmSimulationService.put(key, value)
      showNotification(`Put key '${key}' (seq#${res.sequenceNumber}) ${res.flushed ? '— MemTable auto-flushed to L0!' : ''}`)
      await loadSnapshot()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (key: string) => {
    setIsProcessing(true)
    try {
      const res = await lsmSimulationService.delete(key)
      showNotification(`Tombstone inserted for '${key}' (seq#${res.sequenceNumber})`)
      await loadSnapshot()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFlush = async () => {
    setIsProcessing(true)
    try {
      const res = await lsmSimulationService.flush()
      if (res.flushed) {
        showNotification(`Flushed MemTable → Created new SSTable '${res.sstable?.id}' at Level 0!`)
      }
      await loadSnapshot()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompact = async (level: number) => {
    setIsProcessing(true)
    try {
      const res = await lsmSimulationService.compact(level)
      if (res.success) {
        showNotification(`Compaction complete: Merged ${res.mergedTables.length} tables into '${res.outputTableId}' at Level ${level + 1}!`)
      } else {
        showNotification(`Compaction skipped: Level ${level} needs at least 2 tables to merge.`)
      }
      await loadSnapshot()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProbeKey = async (key: string): Promise<LsmLookupTrace> => {
    const trace = await lsmSimulationService.get(key)
    return trace
  }

  const handleCrashRecover = async () => {
    setIsProcessing(true)
    try {
      const res = await lsmSimulationService.crashRecover()
      showNotification(`Crash Recovery: Replayed ${res.replayedCount} WAL entries, MemTable restored!`)
      await loadSnapshot()
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading || !snapshot) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mr-2" />
        <span>Initializing Storage Engine Studio...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Title & Navigation Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>LSM-Tree &amp; Storage Engine Studio</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                  Milestone 37
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Log-Structured Merge-Tree • MemTable (SkipList) • Write-Ahead Log (WAL) • SSTables • Bloom Filters • Leveled Compaction
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 font-mono block">Storage State</span>
            <span className="text-xs font-mono font-semibold text-emerald-400">
              {snapshot.stats.totalSstables} SSTables • {snapshot.stats.memTableEntries} in RAM
            </span>
          </div>
          <button
            onClick={loadSnapshot}
            disabled={isProcessing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Refresh snapshot"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Studio Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        <button
          onClick={() => setActiveTab('memtable')}
          className={`py-2 px-4 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'memtable'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>MemTable &amp; WAL</span>
        </button>

        <button
          onClick={() => setActiveTab('sstables')}
          className={`py-2 px-4 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'sstables'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>SSTable Hierarchy (L0..L2)</span>
        </button>

        <button
          onClick={() => setActiveTab('bloom')}
          className={`py-2 px-4 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'bloom'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-950/50'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Bloom Filter Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2 px-4 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Storage Engine Audit</span>
        </button>
      </div>

      {/* Main View Area */}
      <div>
        {activeTab === 'memtable' && (
          <MemTableWalVisualizer
            memTable={snapshot.memTable}
            wal={snapshot.wal}
            maxMemTableEntries={snapshot.stats.memTableMaxEntries}
            onPut={handlePut}
            onDelete={handleDelete}
            onFlush={handleFlush}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'sstables' && (
          <SSTableLevelHierarchyView
            sstables={snapshot.sstables}
            onCompact={handleCompact}
            isCompacting={isProcessing}
          />
        )}

        {activeTab === 'bloom' && (
          <BloomFilterBitsetInspector
            sstables={snapshot.sstables}
            onProbeKey={handleProbeKey}
          />
        )}

        {activeTab === 'audit' && (
          <StorageEngineAuditCard
            stats={snapshot.stats}
            onCrashRecover={handleCrashRecover}
            isRecovering={isProcessing}
          />
        )}
      </div>
    </div>
  )
}
export default LsmStorageStudioPage

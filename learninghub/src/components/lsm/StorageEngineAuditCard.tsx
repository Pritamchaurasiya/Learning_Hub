import React from 'react'
import { ShieldCheck, HardDrive, Cpu, RefreshCw } from 'lucide-react'
import type { StorageEngineStats } from '../../types/lsmSimulation'

interface Props {
  stats: StorageEngineStats
  onCrashRecover: () => void
  isRecovering?: boolean
}

export const StorageEngineAuditCard: React.FC<Props> = ({
  stats,
  onCrashRecover,
  isRecovering = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-mono">Write Amplification (WA)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {stats.writeAmplification}x
            </span>
            <span className="text-[10px] text-slate-500 font-mono">disk bytes / app bytes</span>
          </div>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">
            ~10x lower than B+Tree in-place writes
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-mono">Read Amplification (RA)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-indigo-400">
              {stats.readAmplification}x
            </span>
            <span className="text-[10px] text-slate-500 font-mono">tables read / query</span>
          </div>
          <span className="text-[10px] text-indigo-400/80 mt-1 block">
            Bloom filter cuts ~98% of empty checks
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-mono">Space Amplification (SA)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-violet-400">
              {stats.spaceAmplification}x
            </span>
            <span className="text-[10px] text-slate-500 font-mono">disk footprint / live data</span>
          </div>
          <span className="text-[10px] text-violet-400/80 mt-1 block">
            Compacted on L1/L2 merges
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400 block font-mono">Total Disk Footprint</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold font-mono text-slate-200">
              {stats.totalDiskSizeBytes} B
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{stats.totalSstables} SSTables</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {stats.totalCompactions} compactions run
          </span>
        </div>
      </div>

      {/* Architectural Trade-off Matrix */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Storage Engine Architectural Comparison (B+Tree vs LSM-Tree)</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4">Dimension</th>
                <th className="py-2 pr-4 text-amber-400">B+Tree (Postgres/MySQL)</th>
                <th className="py-2 text-emerald-400">LSM-Tree (RocksDB/Cassandra)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2.5 pr-4 text-slate-400">Write Pattern</td>
                <td className="py-2.5 pr-4 text-amber-300/80">In-place overwrite (Random I/O)</td>
                <td className="py-2.5 text-emerald-400 font-bold">Append-only WAL + MemTable (Sequential I/O)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 text-slate-400">Write Throughput</td>
                <td className="py-2.5 pr-4">Bounded by disk seek / page locks</td>
                <td className="py-2.5 text-emerald-400 font-bold">Extremely high (10x-50x B+Tree writes)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 text-slate-400">Read Path</td>
                <td className="py-2.5 pr-4 text-amber-300/80 font-bold">Single leaf page lookup O(log N)</td>
                <td className="py-2.5">Multi-level check (MemTable → L0 → L1), bounded by Bloom filter</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 text-slate-400">Deletes &amp; Updates</td>
                <td className="py-2.5 pr-4">Direct page modification</td>
                <td className="py-2.5">Tombstone insertion, purged during compaction</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 text-slate-400">Typical Workloads</td>
                <td className="py-2.5 pr-4">Read-heavy OLTP, complex range scans</td>
                <td className="py-2.5 text-emerald-400 font-bold">Write-heavy, time-series, log ingestion, key-value</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Crash Recovery Simulation Lab */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span>WAL Crash Recovery Lab</span>
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Simulates an unexpected server power loss: RAM MemTable is wiped out, and the storage engine restarts by replaying the Write-Ahead Log (WAL) to restore state.
          </p>
        </div>
        <button
          onClick={onCrashRecover}
          disabled={isRecovering}
          className="py-2 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors flex items-center gap-2 shadow-lg shadow-indigo-950/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
          <span>Simulate Crash &amp; Recover</span>
        </button>
      </div>

      {/* Cryptographic Audit Seal */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Cryptographic State Audit Digest:</span>
        </div>
        <span className="text-emerald-400/90 font-bold truncate max-w-[280px]">
          {stats.auditDigest}
        </span>
      </div>
    </div>
  )
}

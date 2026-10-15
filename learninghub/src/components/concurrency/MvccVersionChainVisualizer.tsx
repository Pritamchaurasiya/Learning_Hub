import { useState } from 'react'
import type { FC } from 'react'
import {
  Database,
  Layers,
  Clock,
  Trash2,
  CheckCircle2,
  Eye,
  Filter,
} from 'lucide-react'
import type { MvccStateResponse, MvccRowVersion } from '../../types/mvccDeadlock'

interface MvccVersionChainVisualizerProps {
  state: MvccStateResponse | null
  isLoading?: boolean
}

export const MvccVersionChainVisualizer: FC<MvccVersionChainVisualizerProps> = ({
  state,
  isLoading = false,
}) => {
  const [selectedSnapshotTx, setSelectedSnapshotTx] = useState<number>(102)

  if (!state) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400">
        No MVCC state loaded. Click refresh to inspect version chains.
      </div>
    )
  }

  // Check if a row version is visible to a snapshot at txId
  // PostgreSQL visibility rule: xmin <= snapshotTx AND (xmax is null OR xmax > snapshotTx)
  const isVersionVisible = (v: MvccRowVersion, snapshotTx: number) => {
    const createdBeforeSnapshot = v.xmin <= snapshotTx
    const notDeletedBeforeSnapshot = v.xmax === null || v.xmax > snapshotTx
    return createdBeforeSnapshot && notDeletedBeforeSnapshot
  }

  // Check if a row version is eligible for vacuum (garbage collection)
  // Eligible if xmax is not null and xmax < min active snapshot (which is 99)
  const isVacuumEligible = (v: MvccRowVersion) => {
    return v.xmax !== null && v.xmax < 100
  }

  // Group row versions by rowId
  const groupedRows: Record<string, MvccRowVersion[]> = {}
  state.rowVersions.forEach((v) => {
    if (!groupedRows[v.rowId]) groupedRows[v.rowId] = []
    groupedRows[v.rowId].push(v)
  })

  return (
    <div className="space-y-6">
      {/* MVCC Header & Snapshot Selector */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              Multi-Version Concurrency Control (MVCC)
            </span>
            <span className="text-xs text-slate-500 font-mono">|</span>
            <span className="text-xs font-mono text-slate-400">
              Global Commit High-Watermark: <strong>Tx #{state.currentCommitId}</strong>
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Append-Only Version Chains &amp; Snapshot Visibility
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Writers append new tuple versions with <code className="text-cyan-300">xmin</code> without
            overwriting. Readers never block writers and see a consistent point-in-time snapshot.
          </p>
        </div>

        {/* Snapshot Selector */}
        <div className="flex items-center gap-3 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
          <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="text-xs">
            <div className="text-slate-400 font-mono text-[11px]">ACTIVE SNAPSHOT TX:</div>
            <div className="flex items-center gap-1.5 mt-1">
              {[99, 102, 105].map((txId) => (
                <button
                  key={txId}
                  onClick={() => setSelectedSnapshotTx(txId)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    selectedSnapshotTx === txId
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tx #{txId}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Version Chains by Entity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Row Version Chains ({Object.keys(groupedRows).length} Entities)
          </h4>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Viewing from perspective of <strong>Tx #{selectedSnapshotTx}</strong>
          </span>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedRows).map(([rowId, versions]) => (
            <div key={rowId} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono text-xs font-bold text-slate-200">{rowId}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {versions.length} Historical Versions in Heap
                </span>
              </div>

              {/* Version Tuples */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {versions.map((ver) => {
                  const visible = isVersionVisible(ver, selectedSnapshotTx)
                  const vacuumable = isVacuumEligible(ver)
                  const isLive = ver.xmax === null

                  return (
                    <div
                      key={ver.versionId}
                      className={`p-3.5 rounded-lg border text-xs transition-all ${
                        visible
                          ? 'bg-cyan-950/20 border-cyan-700/80 shadow-cyan-950/20 shadow-sm'
                          : vacuumable
                          ? 'bg-rose-950/10 border-rose-900/40 opacity-60'
                          : 'bg-slate-950/60 border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-slate-300">{ver.versionId}</span>
                        {visible ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                            <Eye className="w-3 h-3" /> VISIBLE TO TX #{selectedSnapshotTx}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-slate-800">
                            INVISIBLE
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">xmin (Created by):</span>
                          <span className="text-slate-200 font-bold">Tx #{ver.xmin}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">xmax (Deleted/Superseded by):</span>
                          <span className={isLive ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                            {isLive ? 'LIVE (null)' : `Tx #${ver.xmax}`}
                          </span>
                        </div>
                      </div>

                      {/* Data payload snapshot */}
                      <div className="mt-2.5 p-2 rounded bg-slate-950 border border-slate-800/80 text-[10px] font-mono text-slate-300 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(ver.data, null, 2)}</pre>
                      </div>

                      {/* Vacuum badge */}
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(ver.createdAt).toLocaleTimeString()}
                        </span>
                        {vacuumable ? (
                          <span className="text-rose-400 flex items-center gap-1 font-semibold">
                            <Trash2 className="w-3 h-3" /> Vacuum Eligible
                          </span>
                        ) : isLive ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Current Live
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-xs text-cyan-400 font-mono animate-pulse">
          Refreshing MVCC version chains...
        </div>
      )}
    </div>
  )
}

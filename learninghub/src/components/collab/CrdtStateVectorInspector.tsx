import React, { useState } from 'react'
import {
  GitCommit,
  Layers,
  Database,
  Download,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  FileCode,
} from 'lucide-react'
import {
  CollabRoomState,
  CrdtOperation,
} from '../../types/crdtCollab'

interface CrdtStateVectorInspectorProps {
  room: CollabRoomState | null
  currentPeerId: string
  recentOperations: CrdtOperation[]
  convergencePercentage: number
  isSavingSnapshot: boolean
  onSaveSnapshot: () => void
  onExportSvg: () => void
  onExportJson: () => void
}

export const CrdtStateVectorInspector: React.FC<CrdtStateVectorInspectorProps> = ({
  room,
  currentPeerId,
  recentOperations,
  convergencePercentage,
  isSavingSnapshot,
  onSaveSnapshot,
  onExportSvg,
  onExportJson,
}) => {
  const [copiedCid, setCopiedCid] = useState(false)

  if (!room) return null

  const handleCopyCid = (cid: string) => {
    navigator.clipboard?.writeText(cid)
    setCopiedCid(true)
    setTimeout(() => setCopiedCid(false), 2000)
  }

  const clockEntries = Object.entries(room.vectorClock || {})

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">CRDT State Vector & Consensus</h4>
            <p className="text-[11px] text-slate-400">Lamport clock vector state & deterministic LWW resolution</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportSvg}
            title="Export Vector SVG"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>SVG</span>
          </button>
          <button
            onClick={onExportJson}
            title="Export State JSON"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Vector Clocks Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Peer Lamport Clocks ({clockEntries.length})
          </span>
          <span className="text-[11px] font-mono text-purple-400 font-bold">
            Convergence: {convergencePercentage}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {clockEntries.map(([peerId, clockVal]) => {
            const isLocal = peerId === currentPeerId
            const peerObj = room.peers.find((p) => p.peerId === peerId)
            const name = peerObj ? peerObj.displayName : peerId.slice(0, 8)

            return (
              <div
                key={peerId}
                className={`p-2.5 rounded-xl border text-xs font-mono transition-colors ${
                  isLocal
                    ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                    : 'bg-slate-950/50 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] truncate font-medium text-slate-300">
                    {name} {isLocal && <span className="text-[9px] text-purple-400 font-bold">(You)</span>}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                    L:{clockVal}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* IPFS Multihash Snapshot */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">IPFS Immutable Snapshot</span>
          </div>
          <button
            onClick={onSaveSnapshot}
            disabled={isSavingSnapshot}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSavingSnapshot ? 'animate-spin' : ''}`} />
            <span>{isSavingSnapshot ? 'Pinning...' : 'Pin Snapshot'}</span>
          </button>
        </div>

        {room.ipfsSnapshotCid ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
            <span className="truncate">{room.ipfsSnapshotCid}</span>
            <button
              onClick={() => handleCopyCid(room.ipfsSnapshotCid!)}
              className="p-1 hover:text-white transition"
              title="Copy IPFS CID"
            >
              {copiedCid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            No snapshot pinned yet. Click &quot;Pin Snapshot&quot; to synthesize an immutable IPFS multihash.
          </p>
        )}
      </div>

      {/* Delta Sync Operations Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            Recent CRDT Operations ({recentOperations.length})
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Real-time DataChannel Stream</span>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {recentOperations.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
              No operations dispatched yet. Draw on the whiteboard or edit code blocks to generate CRDT deltas.
            </div>
          ) : (
            recentOperations.slice(-6).reverse().map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                    {op.opType}
                  </span>
                  <span className="text-slate-400 truncate">
                    peer: {op.peerId.slice(-4)}
                  </span>
                </div>
                <span className="text-purple-300 font-bold ml-2">
                  L:{op.lamportClock}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

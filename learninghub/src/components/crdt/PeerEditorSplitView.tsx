import React, { useState } from 'react'
import {
  Users,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  RefreshCw,
  GitMerge,
  Split,
  Laptop,
} from 'lucide-react'
import type { PeerId, PeerState } from '../../types/crdtSimulation'

interface PeerEditorSplitViewProps {
  peers: Record<PeerId, PeerState>
  isPartitioned: boolean
  isolatedPeers: PeerId[]
  onInsert: (peerId: PeerId, index: number, char: string) => void
  onDelete: (peerId: PeerId, visibleIndex: number) => void
  onSyncPeers: (sourceId: PeerId, targetId: PeerId) => void
  onSyncAll: () => void
  onTogglePartition: (peerId: PeerId, active: boolean) => void
  isOperating?: boolean
}

export const PeerEditorSplitView: React.FC<PeerEditorSplitViewProps> = ({
  peers,
  isPartitioned,
  isolatedPeers,
  onInsert,
  onDelete,
  onSyncPeers,
  onSyncAll,
  onTogglePartition,
  isOperating = false,
}) => {
  const [insertInputs, setInsertInputs] = useState<Record<PeerId, string>>({
    alice: '',
    bob: '',
    charlie: '',
  })

  const peerKeys: PeerId[] = ['alice', 'bob', 'charlie']

  const handleInsert = (peerId: PeerId, e: React.FormEvent) => {
    e.preventDefault()
    const text = insertInputs[peerId]
    if (!text) return
    const peer = peers[peerId]
    // Append each character sequentially
    const startIdx = peer.renderedText.length
    for (let i = 0; i < text.length; i++) {
      onInsert(peerId, startIdx + i, text[i])
    }
    setInsertInputs((prev) => ({ ...prev, [peerId]: '' }))
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Disruption Controls */}
      <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              P2P Collaborative Multi-Peer Live Editors
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Simulate concurrent edits across independent peers. Test network partitions and watch deterministic RGA convergence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSyncAll}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isOperating ? 'animate-spin' : ''}`} />
            Sync All Peers
          </button>
        </div>
      </div>

      {/* 3-Column Split View for Alice, Bob, and Charlie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {peerKeys.map((peerId) => {
          const peer = peers[peerId]
          const isIsolated = isolatedPeers.includes(peerId)
          const peerColor =
            peerId === 'alice'
              ? 'border-indigo-200 dark:border-indigo-800'
              : peerId === 'bob'
              ? 'border-emerald-200 dark:border-emerald-800'
              : 'border-amber-200 dark:border-amber-800'

          const headerColor =
            peerId === 'alice'
              ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
              : peerId === 'bob'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'

          return (
            <div
              key={peerId}
              className={`bg-white dark:bg-gray-850 rounded-2xl border-2 ${peerColor} p-5 shadow-sm flex flex-col justify-between space-y-4`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${headerColor} flex items-center gap-1.5`}>
                    <Laptop className="w-3.5 h-3.5" />
                    {peer.name}
                  </span>
                  {isIsolated ? (
                    <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                      <WifiOff className="w-3 h-3" />
                      Partitioned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      <Wifi className="w-3 h-3" />
                      Connected
                    </span>
                  )}
                </div>

                {/* Partition Isolation Toggle */}
                <button
                  onClick={() => onTogglePartition(peerId, !isIsolated)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    isIsolated
                      ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-650'
                  }`}
                  title={isIsolated ? 'Heal network partition' : 'Cut network link (offline mode)'}
                >
                  {isIsolated ? (
                    <span className="flex items-center gap-1">
                      <GitMerge className="w-3 h-3" /> Reconnect
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Split className="w-3 h-3" /> Sever Link
                    </span>
                  )}
                </button>
              </div>

              {/* Vector Clock HUD */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-750 font-mono text-xs text-gray-600 dark:text-gray-300 flex items-center justify-between">
                <span>Vector: [{peer.vectorClock.alice}, {peer.vectorClock.bob}, {peer.vectorClock.charlie}]</span>
                <span className="text-gray-400 dark:text-gray-500">Lamport: {peer.lamportClock}</span>
              </div>

              {/* Document Text Area Display */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                  Replicated Document Buffer
                </label>
                <div className="bg-gray-900 text-emerald-400 font-mono text-sm p-4 rounded-xl min-h-[90px] border border-gray-750 shadow-inner flex items-center flex-wrap gap-1">
                  {peer.renderedText ? (
                    peer.renderedText.split('').map((ch, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center group relative px-1 py-0.5 rounded bg-gray-800 text-white hover:bg-rose-900/60 transition-colors"
                      >
                        {ch}
                        <button
                          onClick={() => onDelete(peerId, idx)}
                          className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 ml-0.5"
                          title={`Delete character '${ch}' at index ${idx}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 italic">Empty document...</span>
                  )}
                </div>
              </div>

              {/* Input Bar */}
              <form onSubmit={(e) => handleInsert(peerId, e)} className="flex items-center gap-2">
                <input
                  type="text"
                  value={insertInputs[peerId]}
                  onChange={(e) =>
                    setInsertInputs((prev) => ({ ...prev, [peerId]: e.target.value }))
                  }
                  placeholder={`Type as ${peer.name}...`}
                  className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!insertInputs[peerId]}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Append
                </button>
              </form>

              {/* Quick Sync with Peers */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-750/60 flex items-center justify-between text-xs text-gray-500">
                <span>Sync with:</span>
                <div className="flex gap-1.5">
                  {peerKeys
                    .filter((p) => p !== peerId)
                    .map((target) => (
                      <button
                        key={target}
                        onClick={() => onSyncPeers(peerId, target)}
                        disabled={isPartitioned && (isIsolated || isolatedPeers.includes(target))}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        → {target.charAt(0).toUpperCase() + target.slice(1)}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

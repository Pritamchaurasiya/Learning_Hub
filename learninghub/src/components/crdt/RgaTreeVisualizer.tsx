import React from 'react'
import { GitCommit, ArrowRight, Skull, CheckCircle2 } from 'lucide-react'
import type { PeerId, PeerState } from '../../types/crdtSimulation'

interface RgaTreeVisualizerProps {
  peers: Record<PeerId, PeerState>
}

export const RgaTreeVisualizer: React.FC<RgaTreeVisualizerProps> = ({ peers }) => {
  const [selectedPeer, setSelectedPeer] = React.useState<PeerId>('alice')
  const activePeer = peers[selectedPeer]

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      {/* Header & Peer Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <GitCommit className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              RGA (Replicated Growable Array) Internal Linked List
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Every character has an immutable globally unique ID <code>(peerId, clock)</code>, a causal parent pointer, and a Lamport scalar for deterministic sibling ordering.
          </p>
        </div>

        {/* Peer Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(['alice', 'bob', 'charlie'] as PeerId[]).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeer(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPeer === p
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}&apos;s View
            </button>
          ))}
        </div>
      </div>

      {/* Node Chain Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>Ordered Character Nodes ({activePeer.rgaNodes.length} nodes)</span>
          <span>Tombstones: {activePeer.rgaNodes.filter((n) => n.isDeleted).length}</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2">
          {activePeer.rgaNodes.map((node, index) => {
            const isTombstone = node.isDeleted
            const peerBadgeColor =
              node.id.peerId === 'alice'
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                : node.id.peerId === 'bob'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'

            return (
              <React.Fragment key={`${node.id.peerId}:${node.id.clock}`}>
                <div
                  className={`min-w-[130px] rounded-xl border p-3 flex flex-col justify-between space-y-2 transition-all ${
                    isTombstone
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 opacity-60'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">
                      {node.char}
                    </span>
                    {isTombstone ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                        <Skull className="w-3 h-3" /> Tombstone
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>ID:</span>
                      <span className={`px-1 rounded text-[10px] font-bold ${peerBadgeColor}`}>
                        {node.id.peerId}:{node.id.clock}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Parent:</span>
                      <span className="text-[10px] text-gray-400">
                        {node.parent ? `${node.parent.peerId}:${node.parent.clock}` : 'ROOT'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Lamport:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{node.lamport}</span>
                    </div>
                  </div>
                </div>

                {index < activePeer.rgaNodes.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Theoretical Explanation */}
      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
        <span className="font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          RGA Deterministic Total Order Invariant:
        </span>
        <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
          When two peers concurrently insert after the same parent node, ties are resolved deterministically by comparing <code>(lamport DESC, peerId DESC)</code>. Because Lamport timestamps respect causal ordering and peer IDs provide a strict total order, all replicas converge to the exact same sequence without server arbitration.
        </p>
      </div>
    </div>
  )
}

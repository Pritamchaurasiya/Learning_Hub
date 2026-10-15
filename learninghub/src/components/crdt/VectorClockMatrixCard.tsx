import React from 'react'
import { Clock, Check, AlertCircle, ArrowLeftRight } from 'lucide-react'
import type { PeerId, PeerState, VectorClock } from '../../types/crdtSimulation'

interface VectorClockMatrixCardProps {
  peers: Record<PeerId, PeerState>
}

export const VectorClockMatrixCard: React.FC<VectorClockMatrixCardProps> = ({ peers }) => {
  const peerList: PeerId[] = ['alice', 'bob', 'charlie']

  // Helper to determine causality between two vector clocks
  const getCausality = (vcA: VectorClock, vcB: VectorClock): { label: string; color: string } => {
    let aGreater = false
    let bGreater = false

    for (const p of peerList) {
      if (vcA[p] > vcB[p]) aGreater = true
      if (vcB[p] > vcA[p]) bGreater = true
    }

    if (!aGreater && !bGreater) {
      return { label: 'Identical (In-Sync)', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' }
    }
    if (aGreater && !bGreater) {
      return { label: 'A dominates B (A > B)', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40' }
    }
    if (bGreater && !aGreater) {
      return { label: 'B dominates A (A < B)', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40' }
    }
    return { label: 'Concurrent (A ∥ B)', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' }
  }

  return (
    <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-750 p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2">
        <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <Clock className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Vector Clock State Matrix & Causal Horizon
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {"Formal causality tracking where event e1 \u2192 e2 \u21D4 V(e1) \u2264 V(e2) and \u2203k: V(e1)[k] < V(e2)[k]."}
          </p>
        </div>
      </div>

      {/* Vector Clock Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-750 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              <th className="py-3 px-4">Replica</th>
              <th className="py-3 px-4 font-mono">V[Alice]</th>
              <th className="py-3 px-4 font-mono">V[Bob]</th>
              <th className="py-3 px-4 font-mono">V[Charlie]</th>
              <th className="py-3 px-4">Scalar Lamport</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {peerList.map((p) => {
              const peer = peers[p]
              return (
                <tr key={p} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 px-4 font-bold capitalize text-gray-900 dark:text-gray-100">
                    {peer.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {peer.vectorClock.alice}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {peer.vectorClock.bob}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {peer.vectorClock.charlie}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-700 dark:text-gray-300">
                    {peer.lamportClock}
                  </td>
                  <td className="py-3.5 px-4">
                    {peer.isOnline ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3" /> Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                        <AlertCircle className="w-3 h-3" /> Partitioned
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pairwise Causality Audit */}
      <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-200 dark:border-gray-750 space-y-3">
        <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
          Pairwise Causal Relationship Audit
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
            <span className="text-xs font-medium text-gray-500">Alice vs Bob:</span>
            {(() => {
              const rel = getCausality(peers.alice.vectorClock, peers.bob.vectorClock)
              return (
                <div className={`text-xs font-bold px-2 py-1 rounded ${rel.color}`}>
                  {rel.label}
                </div>
              )
            })()}
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
            <span className="text-xs font-medium text-gray-500">Alice vs Charlie:</span>
            {(() => {
              const rel = getCausality(peers.alice.vectorClock, peers.charlie.vectorClock)
              return (
                <div className={`text-xs font-bold px-2 py-1 rounded ${rel.color}`}>
                  {rel.label}
                </div>
              )
            })()}
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
            <span className="text-xs font-medium text-gray-500">Bob vs Charlie:</span>
            {(() => {
              const rel = getCausality(peers.bob.vectorClock, peers.charlie.vectorClock)
              return (
                <div className={`text-xs font-bold px-2 py-1 rounded ${rel.color}`}>
                  {rel.label}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

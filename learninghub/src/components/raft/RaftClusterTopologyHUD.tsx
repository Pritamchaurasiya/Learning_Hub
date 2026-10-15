import type { FC } from 'react'
import {
  Server,
  Crown,
  Vote,
  Radio,
  ZapOff,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { RaftNodeState, RaftRole } from '../../types/raftSimulation'

interface RaftClusterTopologyHUDProps {
  nodes: RaftNodeState[]
  leaderId: string | null
  networkPartitionActive: boolean
  selectedNodeId?: string
  onSelectNode: (nodeId: string) => void
  onTriggerElection: (nodeId: string) => void
  onToggleNodeCrash: (nodeId: string, isAlive: boolean) => void
}

export const RaftClusterTopologyHUD: FC<RaftClusterTopologyHUDProps> = ({
  nodes,
  leaderId,
  networkPartitionActive,
  selectedNodeId,
  onSelectNode,
  onTriggerElection,
  onToggleNodeCrash,
}) => {
  const getRoleBadge = (role: RaftRole, isAlive: boolean) => {
    if (!isAlive || role === 'DEAD') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950/70 text-rose-300 border border-rose-800">
          <ZapOff className="w-3 h-3" /> CRASHED
        </span>
      )
    }
    switch (role) {
      case 'LEADER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600 animate-pulse">
            <Crown className="w-3 h-3 text-amber-400" /> LEADER
          </span>
        )
      case 'CANDIDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-600">
            <Vote className="w-3 h-3" /> CANDIDATE
          </span>
        )
      case 'FOLLOWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-700">
            <Radio className="w-3 h-3 text-indigo-400" /> FOLLOWER
          </span>
        )
    }
  }

  const getPartitionBadge = (partitionGroup: string) => {
    if (!networkPartitionActive || partitionGroup === 'DEFAULT') return null
    const isGroupA = partitionGroup === 'GROUP_A'
    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
          isGroupA
            ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
            : 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
        }`}
      >
        Partition {isGroupA ? 'A (Minority)' : 'B (Majority)'}
      </span>
    )
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Cluster Node Topology & Consensus Heartbeats
          </h3>
          <span className="text-xs font-mono text-slate-400">({nodes.length} Server Nodes)</span>
        </div>
        {networkPartitionActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Split-Brain Network Partition Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {nodes.map(node => {
          const isSelected = selectedNodeId === node.id
          const isLeader = node.role === 'LEADER' || (Boolean(leaderId) && node.id === leaderId && node.isAlive)
          const timerProgress = Math.min(
            100,
            Math.round((node.electionElapsedMs / Math.max(1, node.electionTimeoutMs)) * 100)
          )

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`relative cursor-pointer transition-all duration-200 rounded-xl p-4 border text-left flex flex-col justify-between ${
                !node.isAlive
                  ? 'bg-slate-950/60 border-slate-800 opacity-60'
                  : isLeader
                  ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/50'
                  : isSelected
                  ? 'bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-950/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    {node.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">ID: {node.id}</span>
                </div>
                {getRoleBadge(node.role, node.isAlive)}
              </div>

              {/* Partition Tag if active */}
              {getPartitionBadge(node.partitionGroup) && (
                <div className="mb-2">{getPartitionBadge(node.partitionGroup)}</div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 my-1 border-t border-b border-slate-800/80">
                <div>
                  <span className="text-slate-400 block text-[10px]">CURRENT TERM</span>
                  <span className="font-bold text-white text-sm">Term {node.currentTerm}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">VOTED FOR</span>
                  <span className="text-slate-300 font-semibold truncate block">
                    {node.votedFor || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">COMMIT INDEX</span>
                  <span className="font-bold text-emerald-400">{node.commitIndex}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">LOG LENGTH</span>
                  <span className="font-bold text-indigo-300">{node.log.length} entries</span>
                </div>
              </div>

              {/* Election Timer Progress (for followers/candidates) */}
              {node.isAlive && node.role !== 'LEADER' && (
                <div className="mt-1 mb-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Election Timer
                    </span>
                    <span>
                      {node.electionElapsedMs}ms / {node.electionTimeoutMs}ms
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        timerProgress > 80 ? 'bg-amber-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${timerProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-800/60">
                {node.isAlive ? (
                  <>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onTriggerElection(node.id)
                      }}
                      className="flex-1 px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded text-[11px] font-medium transition"
                      title="Trigger election timeout now"
                    >
                      Trigger Vote
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        onToggleNodeCrash(node.id, true)
                      }}
                      className="px-2 py-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded text-[11px] font-medium transition"
                      title="Crash node"
                    >
                      Crash
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onToggleNodeCrash(node.id, false)
                    }}
                    className="w-full px-2 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-[11px] font-medium transition"
                  >
                    Recover Node
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

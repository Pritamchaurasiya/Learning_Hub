import { FileCode, CheckCircle, Database } from 'lucide-react'
import { RaftNodeState } from '../../types/raftSimulation'

interface RaftLogReplicationMatrixProps {
  nodes: RaftNodeState[]
  leaderId: string | null
}

export const RaftLogReplicationMatrix: React.FC<RaftLogReplicationMatrixProps> = ({
  nodes,
  leaderId,
}) => {
  // Find maximum log length across all nodes
  const maxLogLength = Math.max(
    1,
    ...nodes.filter(n => n.isAlive).map(n => n.log.length)
  )
  const indices = Array.from({ length: maxLogLength }, (_, i) => i + 1)

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white tracking-wide">
            Distributed Replicated Log Matrix & Commit Index
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Committed Entry
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Uncommitted / In-Flight
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="py-2.5 px-3 text-slate-400 font-semibold w-28">Server Node</th>
              <th className="py-2.5 px-3 text-slate-400 font-semibold w-24">Commit Idx</th>
              {indices.map(idx => (
                <th key={idx} className="py-2.5 px-3 text-slate-300 font-bold text-center min-w-[120px]">
                  Index #{idx}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {nodes.map(node => {
              const isLeader = node.id === leaderId && node.isAlive

              return (
                <tr
                  key={node.id}
                  className={`transition-colors ${
                    !node.isAlive
                      ? 'bg-rose-950/20 opacity-50'
                      : isLeader
                      ? 'bg-emerald-950/20'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{node.name}</span>
                      {isLeader && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-600">
                          LEADER
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                      idx: {node.commitIndex}
                    </span>
                  </td>
                  {indices.map(idx => {
                    const entry = node.log.find(e => e.index === idx)
                    const isCommitted = entry && idx <= node.commitIndex

                    return (
                      <td key={idx} className="py-3 px-2 text-center">
                        {entry ? (
                          <div
                            className={`p-2 rounded-lg border text-left flex flex-col gap-0.5 ${
                              isCommitted
                                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                                : 'bg-amber-950/50 border-amber-600 text-amber-200'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 border-b border-slate-700/50 pb-0.5">
                              <span>Term {entry.term}</span>
                              {isCommitted ? (
                                <span className="text-emerald-400 flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" /> committed
                                </span>
                              ) : (
                                <span className="text-amber-400">pending</span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-white truncate block mt-0.5">
                              {entry.command}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-700 text-xs">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* State Machine KV Store Snapshot */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Deterministic State Machine Applied State (Applied Key-Value Store)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {nodes.map(node => (
            <div
              key={node.id}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-xs font-mono"
            >
              <div className="text-slate-400 text-[10px] font-bold mb-1 truncate">
                {node.name} (Applied: {node.lastApplied})
              </div>
              <pre className="text-cyan-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(node.stateMachine, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

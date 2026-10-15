import type { FC } from 'react'
import {
  GitFork,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Lock,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import type { DeadlockDetectionResult } from '../../types/mvccDeadlock'

interface WaitForGraphDeadlockHUDProps {
  result: DeadlockDetectionResult | null
  currentScenario: 'TWO_NODE_CYCLE' | 'THREE_NODE_CYCLE' | 'NO_DEADLOCK'
  currentPolicy: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY'
  onSelectScenario: (scenario: 'TWO_NODE_CYCLE' | 'THREE_NODE_CYCLE' | 'NO_DEADLOCK') => void
  onSelectPolicy: (policy: 'YOUNGEST' | 'LEAST_LOCKS' | 'LEAST_PRIORITY') => void
  onRunDetection: () => void
  isLoading?: boolean
}

export const WaitForGraphDeadlockHUD: FC<WaitForGraphDeadlockHUDProps> = ({
  result,
  currentScenario,
  currentPolicy,
  onSelectScenario,
  onSelectPolicy,
  onRunDetection,
  isLoading = false,
}) => {
  if (!result) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400">
        Click "Analyze Wait-For Graph" to run Tarjan's cycle detection.
      </div>
    )
  }

  const hasCycle = result.cyclePaths.length > 0

  return (
    <div className="space-y-6">
      {/* HUD Header & Scenarios Controls */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold">
                Distributed Lock Manager (DLM)
              </span>
              <span className="text-xs text-slate-500 font-mono">|</span>
              <span className="text-xs font-mono text-slate-400">
                Algorithm: <strong className="text-slate-200">Tarjan's SCC &amp; DFS Cycle Detection</strong>
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              <GitFork className="w-5 h-5 text-rose-400" />
              Wait-For Graph (WFG) &amp; Deadlock Resolver
            </h3>
          </div>

          {/* Action Button */}
          <button
            onClick={onRunDetection}
            disabled={isLoading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Run Cycle Detection
          </button>
        </div>

        {/* Scenario & Policy Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs font-mono">
          {/* Scenario Selector */}
          <div>
            <span className="text-slate-400 block mb-1.5">Contention Scenario:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectScenario('TWO_NODE_CYCLE')}
                className={`px-2.5 py-1 rounded transition-all ${
                  currentScenario === 'TWO_NODE_CYCLE'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                2-Way Deadlock (A &harr; B)
              </button>
              <button
                onClick={() => onSelectScenario('THREE_NODE_CYCLE')}
                className={`px-2.5 py-1 rounded transition-all ${
                  currentScenario === 'THREE_NODE_CYCLE'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                3-Way Cycle (A &rarr; B &rarr; C &rarr; A)
              </button>
              <button
                onClick={() => onSelectScenario('NO_DEADLOCK')}
                className={`px-2.5 py-1 rounded transition-all ${
                  currentScenario === 'NO_DEADLOCK'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                Acyclic DAG (Safe)
              </button>
            </div>
          </div>

          {/* Victim Policy Selector */}
          <div>
            <span className="text-slate-400 block mb-1.5">Deadlock Victim Policy:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectPolicy('YOUNGEST')}
                className={`px-2.5 py-1 rounded transition-all ${
                  currentPolicy === 'YOUNGEST'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                YOUNGEST (Latest Tx)
              </button>
              <button
                onClick={() => onSelectPolicy('LEAST_PRIORITY')}
                className={`px-2.5 py-1 rounded transition-all ${
                  currentPolicy === 'LEAST_PRIORITY'
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                LEAST_PRIORITY
              </button>
            </div>
          </div>
        </div>

        {/* Resolution Banner */}
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
            hasCycle
              ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
              : 'bg-emerald-950/40 border-emerald-600/70 text-emerald-200'
          }`}
        >
          {hasCycle ? (
            <Flame className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold">
              {hasCycle ? 'Deadlock Detected & Broken:' : 'Topology Audit Clean:'}
            </span>{' '}
            {result.resolutionMessage}
          </div>
        </div>
      </div>

      {/* Active Transactions in Graph */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Active Transaction Nodes ({result.activeTransactions.length})
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            {hasCycle ? `Cycle Path: [${result.cyclePaths[0]?.join(' \u2192 ')}]` : 'Acyclic Graph'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result.activeTransactions.map((tx) => {
            const isVictim = tx.status === 'VICTIM_ABORTED'

            return (
              <div
                key={tx.txId}
                className={`p-4 rounded-xl border transition-all ${
                  isVictim
                    ? 'bg-rose-950/30 border-rose-600 shadow-rose-950/30 shadow-md animate-pulse'
                    : tx.status === 'WAITING'
                    ? 'bg-amber-950/20 border-amber-800/80'
                    : 'bg-emerald-950/20 border-emerald-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-300">
                    Tx #{tx.txId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isVictim
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : tx.status === 'WAITING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-100">{tx.name}</div>

                <div className="mt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Priority:</span>
                    <span className="text-indigo-300 font-bold">{tx.priority}/10</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Held Locks:</span>
                    <div className="flex flex-wrap gap-1">
                      {tx.heldLocks.length > 0 ? (
                        tx.heldLocks.map((lockId) => (
                          <span
                            key={lockId}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isVictim
                                ? 'bg-slate-800 text-slate-400 line-through'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {lockId}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500">None</span>
                      )}
                    </div>
                  </div>

                  {tx.waitingForLock && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-rose-400 text-[11px] block mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Waiting for Lock:
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                        {tx.waitingForLock}
                      </span>
                    </div>
                  )}
                </div>

                {isVictim && (
                  <div className="mt-3 pt-2 border-t border-rose-900/60 text-[11px] font-mono text-rose-300 flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rolled back to break cycle
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Directed Edge List */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
        <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
          Wait-For Graph Dependency Edges ($E \subseteq V \times V$)
        </h4>

        <div className="space-y-2">
          {result.edges.map((edge, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-slate-800 text-xs font-mono"
            >
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-amber-400 font-bold">Tx #{edge.fromTxId}</span>
                <span className="text-slate-500">&rarr;</span>
                <span className="text-slate-400">waiting for resource</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                  {edge.resourceId}
                </span>
                <span className="text-slate-400">held by</span>
                <span className="text-emerald-400 font-bold">Tx #{edge.toTxId}</span>
              </div>
              <span className="text-[10px] text-slate-500">Wait: {edge.waitDurationMs} ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

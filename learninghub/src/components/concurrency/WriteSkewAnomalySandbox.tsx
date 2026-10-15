import type { FC } from 'react'
import {
  AlertTriangle,
  XCircle,
  Play,
  UserCheck,
  UserX,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import type { WriteSkewSimulationResult } from '../../types/mvccDeadlock'

interface WriteSkewAnomalySandboxProps {
  result: WriteSkewSimulationResult | null
  currentProtocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI'
  onSelectProtocol: (protocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI') => void
  onRunSimulation: (protocol: 'SNAPSHOT_ISOLATION' | 'SERIALIZABLE_SSI') => void
  isLoading?: boolean
}

export const WriteSkewAnomalySandbox: FC<WriteSkewAnomalySandboxProps> = ({
  result,
  currentProtocol,
  onSelectProtocol,
  onRunSimulation,
  isLoading = false,
}) => {
  if (!result) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400">
        Click "Run Write Skew Simulation" to inspect concurrency behavior.
      </div>
    )
  }

  const isAnomaly = result.anomalyDetected

  return (
    <div className="space-y-6">
      {/* Sandbox Header & Control Bar */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">
                Concurrency Anomaly Lab
              </span>
              <span className="text-xs text-slate-500 font-mono">|</span>
              <span className="text-xs font-mono text-slate-400">
                Invariant: <strong className="text-amber-300">Doctors On Call &ge; 1</strong>
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Write Skew Anomaly Simulator (Hospital Shift Scheduling)
            </h3>
          </div>

          {/* Protocol Toggle & Run */}
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => onSelectProtocol('SNAPSHOT_ISOLATION')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                  currentProtocol === 'SNAPSHOT_ISOLATION'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Snapshot Isolation (SI)
              </button>
              <button
                onClick={() => onSelectProtocol('SERIALIZABLE_SSI')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                  currentProtocol === 'SERIALIZABLE_SSI'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Serializable (SSI)
              </button>
            </div>

            <button
              onClick={() => onRunSimulation(currentProtocol)}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              Run Simulation
            </button>
          </div>
        </div>

        {/* Anomaly Outcome Alert */}
        {isAnomaly ? (
          <div className="p-3.5 bg-rose-950/40 border border-rose-600/70 rounded-lg flex items-start gap-3 text-rose-200 text-xs">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">CRITICAL ANOMALY: Write Skew Occurred!</span>{' '}
              {result.explanation}
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-600/70 rounded-lg flex items-start gap-3 text-emerald-200 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ANOMALY PREVENTED: Serializable Snapshot Isolation (SSI) Protected Invariant!</span>{' '}
              {result.explanation}
            </div>
          </div>
        )}
      </div>

      {/* Concurrent Transaction Race Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transaction 1 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                Transaction 1 (Tx #{result.transaction1.txId})
              </span>
              <h5 className="font-semibold text-slate-200 text-sm">{result.transaction1.action}</h5>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                result.transaction1.status === 'COMMITTED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}
            >
              {result.transaction1.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="text-slate-400">1. Snapshot Read:</div>
              <div className="text-slate-200">
                Observed on-call count = <strong>{result.transaction1.observedOnCallCount}</strong> (&ge; 2)
              </div>
              <div className="text-slate-400 mt-2">2. Mutation &amp; Commit:</div>
              <div className="text-slate-300">{result.transaction1.decision}</div>
            </div>
          </div>
        </div>

        {/* Transaction 2 */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-xs font-mono text-purple-400 font-bold">
                Transaction 2 (Tx #{result.transaction2.txId})
              </span>
              <h5 className="font-semibold text-slate-200 text-sm">{result.transaction2.action}</h5>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                result.transaction2.status === 'COMMITTED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
              }`}
            >
              {result.transaction2.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="text-slate-400">1. Snapshot Read:</div>
              <div className="text-slate-200">
                Observed on-call count = <strong>{result.transaction2.observedOnCallCount}</strong> (&ge; 2)
              </div>
              <div className="text-slate-400 mt-2">2. Mutation &amp; Commit:</div>
              <div className="text-slate-300">{result.transaction2.decision}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Before vs After Hospital Shift Status */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
        <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          Shift State Transition (Initial vs Final)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Initial State */}
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2">
            <div className="text-slate-400 font-bold">Initial State (Invariant Satisfied):</div>
            <div className="space-y-1.5">
              {result.initialState.map((doc) => (
                <div key={doc.doctorId} className="flex items-center justify-between p-1.5 rounded bg-slate-900/80">
                  <span className="text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {doc.name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                    ON CALL
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Final State */}
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-2">
            <div className="text-slate-400 font-bold flex items-center justify-between">
              <span>Final State After Concurrent Execution:</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  result.finalState.some((d) => d.isOnCall)
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}
              >
                {result.finalState.filter((d) => d.isOnCall).length} ON CALL
              </span>
            </div>
            <div className="space-y-1.5">
              {result.finalState.map((doc) => (
                <div key={doc.doctorId} className="flex items-center justify-between p-1.5 rounded bg-slate-900/80">
                  <span className="text-slate-200 flex items-center gap-1.5">
                    {doc.isOnCall ? (
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <UserX className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {doc.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      doc.isOnCall
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {doc.isOnCall ? 'ON CALL' : 'OFF CALL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

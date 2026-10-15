import type { FC } from 'react'
import {
  Database,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ZapOff,
} from 'lucide-react'
import type {
  TwoPhaseTransactionRecord,
  TwoPhaseParticipantState,
} from '../../types/distributedTransaction'

interface TwoPhaseCommitVisualizerProps {
  record: TwoPhaseTransactionRecord | null
  isLoading?: boolean
}

export const TwoPhaseCommitVisualizer: FC<TwoPhaseCommitVisualizerProps> = ({
  record,
  isLoading = false,
}) => {
  if (!record) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400">
        No active Two-Phase Commit transaction. Click "Execute 2PC" to run a simulation.
      </div>
    )
  }

  const getCoordinatorBadge = (status: TwoPhaseTransactionRecord['coordinatorStatus']) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" /> STATUS: DONE
          </span>
        )
      case 'DECIDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-600 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> BLOCKED / DECIDING
          </span>
        )
      case 'COMMITTING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-blue-950/80 text-blue-300 border border-blue-600">
            COMMITTING
          </span>
        )
      case 'ABORTING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-950/80 text-rose-300 border border-rose-600">
            ABORTING
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        )
    }
  }

  const getParticipantVoteBadge = (vote: TwoPhaseParticipantState['vote']) => {
    switch (vote) {
      case 'VOTE_COMMIT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VOTE_COMMIT
          </span>
        )
      case 'VOTE_ABORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-700">
            <XCircle className="w-3 h-3 text-rose-400" /> VOTE_ABORT
          </span>
        )
      case 'CRASHED':
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-700">
            <ZapOff className="w-3 h-3 text-amber-400" /> {vote}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-400 border border-slate-800">
            PENDING
          </span>
        )
    }
  }

  const getParticipantStatusBadge = (status: TwoPhaseParticipantState['status']) => {
    switch (status) {
      case 'COMMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-900/50 text-emerald-200 border border-emerald-600">
            <Unlock className="w-3 h-3" /> COMMITTED
          </span>
        )
      case 'ABORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-rose-900/50 text-rose-200 border border-rose-600">
            <Unlock className="w-3 h-3" /> ABORTED
          </span>
        )
      case 'LOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-amber-900/50 text-amber-200 border border-amber-500 animate-pulse">
            <Lock className="w-3 h-3 text-amber-400" /> LOCKED (BLOCKED)
          </span>
        )
      case 'PREPARED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-900/50 text-blue-200 border border-blue-600">
            <Lock className="w-3 h-3" /> PREPARED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-400 border border-slate-700">
            {status}
          </span>
        )
    }
  }

  const isBlocked = record.finalVerdict === 'BLOCKED_TIMEOUT'
  const isAborted = record.finalVerdict === 'ABORTED'

  return (
    <div className="space-y-6">
      {/* High-level Transaction Header */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                Two-Phase Commit (XA Standard)
              </span>
              <span className="text-xs text-slate-500 font-mono">|</span>
              <span className="text-xs font-mono text-slate-400">TxID: {record.transactionId}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              Coordinator: Transaction Manager
              {getCoordinatorBadge(record.coordinatorStatus)}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">FINAL VERDICT</div>
              <div
                className={`text-sm font-bold font-mono ${
                  record.finalVerdict === 'COMMITTED'
                    ? 'text-emerald-400'
                    : isBlocked
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {record.finalVerdict}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">LATENCY</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {record.durationMs} ms
              </div>
            </div>
          </div>
        </div>

        {/* Blocking Warning Banner */}
        {isBlocked && (
          <div className="mt-4 p-3.5 bg-amber-950/40 border border-amber-600/60 rounded-lg flex items-start gap-3 text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">2PC Blocking Problem Triggered:</span> The coordinator crashed
              or timed out after participants voted PREPARE. Participants hold exclusive row locks and
              CANNOT safely commit or abort unilaterally until the coordinator recovers or an operator
              intervenes. This illustrates why modern microservice architectures often prefer Sagas over 2PC.
            </div>
          </div>
        )}

        {isAborted && !isBlocked && (
          <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-600/60 rounded-lg flex items-start gap-3 text-rose-200 text-xs">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Atomic Rollback Executed:</span> At least one participant voted
              ABORT during Phase 1. The coordinator enforced global consistency by broadcasting GLOBAL_ABORT,
              releasing all acquired locks across every database.
            </div>
          </div>
        )}
      </div>

      {/* Participants Topology Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            Resource Managers (Participants)
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            {record.participants.length} Active Data Stores
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {record.participants.map((p) => {
            const isFailing = p.vote === 'VOTE_ABORT' || p.vote === 'CRASHED'
            const isHoldingLocks = p.status === 'LOCKED' || p.status === 'PREPARED'

            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all ${
                  isFailing
                    ? 'bg-rose-950/20 border-rose-800/80 shadow-rose-950/20 shadow-md'
                    : isHoldingLocks
                    ? 'bg-amber-950/20 border-amber-800/80 shadow-amber-950/20 shadow-md'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-200 text-sm">{p.name}</h5>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{p.serviceName}</p>
                  </div>
                  {getParticipantStatusBadge(p.status)}
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">Phase 1 Vote:</span>
                    {getParticipantVoteBadge(p.vote)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">Store Latency:</span>
                    <span className="font-mono text-slate-300 font-semibold">{p.latencyMs} ms</span>
                  </div>
                </div>

                {/* Locked Resources */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      {isHoldingLocks ? (
                        <Lock className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Unlock className="w-3 h-3 text-slate-500" />
                      )}
                      Locked Resources:
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {isHoldingLocks ? 'EXCLUSIVELY HELD' : 'RELEASED'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.lockedResources.map((res) => (
                      <span
                        key={res}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isHoldingLocks
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                        }`}
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Protocol Message Exchange Log */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
        <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Coordinator &harr; Participant Protocol Trace
        </h4>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {record.executionLog.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs font-mono p-2 rounded bg-slate-950/60 border border-slate-800/60"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  log.phase === 'PHASE_1_PREPARE'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                    : log.phase === 'PHASE_2_DECISION'
                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {log.phase}
              </span>
              <span className="text-slate-400">
                {log.source} <ArrowRight className="inline w-3 h-3 text-slate-600" /> {log.target}:
              </span>
              <span className="text-slate-200 flex-1">{log.message}</span>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
      {isLoading && <div className="text-xs text-indigo-400 font-mono animate-pulse">Synchronizing transaction...</div>}
    </div>
  )
}

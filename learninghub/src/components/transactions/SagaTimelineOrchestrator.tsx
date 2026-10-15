import type { FC } from 'react'
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Layers,
  History,
  FileText,
} from 'lucide-react'
import type {
  SagaExecutionRecord,
  SagaStepDefinition,
  SagaStepStatus,
} from '../../types/distributedTransaction'

interface SagaTimelineOrchestratorProps {
  record: SagaExecutionRecord | null
  isLoading?: boolean
}

export const SagaTimelineOrchestrator: FC<SagaTimelineOrchestratorProps> = ({
  record,
  isLoading = false,
}) => {
  if (!record) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400">
        No active Saga execution. Click "Execute Saga" to run a distributed workflow.
      </div>
    )
  }

  const getStepStatusBadge = (status: SagaStepStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SUCCESS
          </span>
        )
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-600 animate-pulse">
            <XCircle className="w-3 h-3 text-rose-400" /> FAILED
          </span>
        )
      case 'COMPENSATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-600">
            <RotateCcw className="w-3 h-3 text-amber-400" /> COMPENSATED
          </span>
        )
      case 'COMPENSATING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-600 animate-pulse">
            <RotateCcw className="w-3 h-3 text-purple-400" /> COMPENSATING...
          </span>
        )
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-600 animate-pulse">
            RUNNING...
          </span>
        )
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-400 border border-slate-800">
            <Clock className="w-3 h-3 text-slate-500" /> PENDING
          </span>
        )
    }
  }

  const isRolledBack = record.overallStatus === 'ROLLED_BACK'
  const isCompleted = record.overallStatus === 'COMPLETED'

  return (
    <div className="space-y-6">
      {/* High-level Saga Status Header */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">
                Saga Orchestrator Pattern (Eventual Consistency)
              </span>
              <span className="text-xs text-slate-500 font-mono">|</span>
              <span className="text-xs font-mono text-slate-400">SagaID: {record.sagaId}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              {record.sagaName}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">OVERALL STATUS</div>
              <div
                className={`text-sm font-bold font-mono ${
                  isCompleted
                    ? 'text-emerald-400'
                    : isRolledBack
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {record.overallStatus}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">EXECUTION TIME</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {record.totalDurationMs} ms
              </div>
            </div>
          </div>
        </div>

        {/* Saga Explanation Note */}
        {isRolledBack && (
          <div className="mt-4 p-3.5 bg-amber-950/40 border border-amber-600/60 rounded-lg flex items-start gap-3 text-amber-200 text-xs">
            <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Backward Compensation Triggered:</span> When a downstream step
              failed, the orchestrator did not freeze or leave blocking locks. Instead, it systematically
              executed compensating transactions in reverse order (LIFO) to semantically undo preceding
              committed actions, guaranteeing eventual consistency without holding distributed locks.
            </div>
          </div>
        )}
      </div>

      {/* Sequential Pipeline Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            Forward Action Pipeline ({record.steps.length} Steps)
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            {isRolledBack ? 'Compensated' : 'All Steps Completed'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {record.steps.map((step: SagaStepDefinition) => {
            const isFailed = step.status === 'FAILED'
            const isCompensated = step.status === 'COMPENSATED'

            return (
              <div
                key={step.stepIndex}
                className={`p-4 rounded-xl border transition-all relative ${
                  isFailed
                    ? 'bg-rose-950/20 border-rose-700/80 shadow-rose-950/20 shadow-md'
                    : isCompensated
                    ? 'bg-amber-950/20 border-amber-700/80 shadow-amber-950/20 shadow-md'
                    : step.status === 'SUCCESS'
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Step {step.stepIndex + 1}
                  </span>
                  {getStepStatusBadge(step.status)}
                </div>

                <div className="text-xs font-mono text-indigo-400 truncate font-semibold">
                  {step.serviceName}
                </div>
                <div className="font-bold text-slate-100 text-sm mt-1">{step.actionName}</div>

                {/* Error Banner if Failed */}
                {isFailed && step.errorReason && (
                  <div className="mt-2 p-2 bg-rose-900/40 border border-rose-700/60 rounded text-[11px] text-rose-200">
                    {step.errorReason}
                  </div>
                )}

                {/* Compensation Action Tag */}
                <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono">
                  <span className="text-slate-400 block mb-1">Compensating Action:</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded ${
                      isCompensated
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}
                  >
                    {step.compensationName}
                  </span>
                </div>

                {/* Step Duration */}
                <div className="mt-2 text-[10px] font-mono text-slate-500 text-right">
                  {step.executionTimeMs} ms
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backward Compensation History Timeline */}
      {record.compensationHistory.length > 0 && (
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Executed Backward Compensating Transactions (LIFO Order)
          </h4>

          <div className="space-y-2">
            {record.compensationHistory.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded bg-slate-950/70 border border-amber-900/40 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Undoing [{item.compensatedStep}]:</span>
                  <span className="text-amber-300 font-bold">{item.compensationAction}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-semibold">
                    {item.status}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-xs text-purple-400 font-mono animate-pulse">
          Executing Saga workflow step...
        </div>
      )}
    </div>
  )
}

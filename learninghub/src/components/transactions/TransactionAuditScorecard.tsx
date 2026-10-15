import type { FC } from 'react'
import {
  ShieldCheck,
  Zap,
  Scale,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react'
import type { ProtocolComparisonResponse } from '../../types/distributedTransaction'

interface TransactionAuditScorecardProps {
  comparison: ProtocolComparisonResponse | null
  currentProof?: string
  protocolName: string
}

export const TransactionAuditScorecard: FC<TransactionAuditScorecardProps> = ({
  comparison,
  currentProof,
  protocolName,
}) => {
  const copyProof = () => {
    if (currentProof && navigator.clipboard) {
      navigator.clipboard.writeText(currentProof)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cryptographic Audit Seal */}
      {currentProof && (
        <div className="p-4 bg-slate-900/90 border border-indigo-900/40 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-mono font-semibold text-slate-300">
                Cryptographic Consensus Audit Seal ({protocolName}):
              </span>
              <div className="text-[11px] font-mono text-slate-400 break-all select-all">
                {currentProof}
              </div>
            </div>
          </div>
          <button
            onClick={copyProof}
            className="px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 shrink-0"
          >
            <Copy className="w-3 h-3" /> Copy Seal
          </button>
        </div>
      )}

      {/* Architectural Trade-off Matrix */}
      {comparison && (
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Distributed Transaction Architecture Comparison (2PC vs Saga)
            </h3>
            <span className="text-xs text-slate-400 font-mono">CAP &amp; PACELC Trade-Off Matrix</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2PC Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-indigo-300 text-sm">
                  {comparison.protocols.twoPhaseCommit.name}
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  ACID (STRONG)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-mono">Consistency Model:</span>
                  <div className="text-slate-200 font-medium">
                    {comparison.protocols.twoPhaseCommit.consistencyModel}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-mono">Coordination Style:</span>
                  <div className="text-slate-200">
                    {comparison.protocols.twoPhaseCommit.coordinationStyle}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Performance &amp; Locking:
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Latency: {comparison.protocols.twoPhaseCommit.performanceCharacteristics.latency}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Throughput: {comparison.protocols.twoPhaseCommit.performanceCharacteristics.throughput}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Lock Hold: {comparison.protocols.twoPhaseCommit.performanceCharacteristics.resourceLockDuration}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/30 space-y-1">
                  <div className="text-[11px] font-mono text-rose-300 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Failure Resilience:
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Coord Crash: {comparison.protocols.twoPhaseCommit.failureResilience.coordinatorCrash}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Partition: {comparison.protocols.twoPhaseCommit.failureResilience.networkPartition}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-mono text-[11px] block mb-1">
                    Ideal For:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {comparison.protocols.twoPhaseCommit.recommendedUseCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* SAGA Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-purple-300 text-sm">
                  {comparison.protocols.sagaOrchestration.name}
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  BASE (EVENTUAL)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-mono">Consistency Model:</span>
                  <div className="text-slate-200 font-medium">
                    {comparison.protocols.sagaOrchestration.consistencyModel}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-mono">Coordination Style:</span>
                  <div className="text-slate-200">
                    {comparison.protocols.sagaOrchestration.coordinationStyle}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[11px] font-mono text-purple-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Performance &amp; Scalability:
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Latency: {comparison.protocols.sagaOrchestration.performanceCharacteristics.latency}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Throughput: {comparison.protocols.sagaOrchestration.performanceCharacteristics.throughput}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Lock Hold: {comparison.protocols.sagaOrchestration.performanceCharacteristics.resourceLockDuration}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-900/30 space-y-1">
                  <div className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Failure Resilience:
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Recovery: {comparison.protocols.sagaOrchestration.failureResilience.partialFailureRecovery}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    &bull; Partition: {comparison.protocols.sagaOrchestration.failureResilience.networkPartition}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-mono text-[11px] block mb-1">
                    Ideal For:
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {comparison.protocols.sagaOrchestration.recommendedUseCases.map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Architectural Summary Banner */}
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
            <span className="font-bold text-cyan-400">Architectural Rule of Thumb: </span>
            {comparison.summaryVerdict}
          </div>
        </div>
      )}
    </div>
  )
}

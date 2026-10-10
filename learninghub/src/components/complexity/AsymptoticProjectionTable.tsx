import React from 'react'
import { AsymptoticProjection, ModelFitResult } from '../../types/complexity'
import { Server, Clock, HardDrive, CheckCircle2, AlertTriangle, XCircle, Gauge } from 'lucide-react'

interface AsymptoticProjectionTableProps {
  projections: AsymptoticProjection[]
  primaryModel: ModelFitResult
}

export const AsymptoticProjectionTable: React.FC<AsymptoticProjectionTableProps> = ({
  projections,
  primaryModel,
}) => {
  const getVerdictBadge = (verdict: AsymptoticProjection['feasibilityVerdict']) => {
    switch (verdict) {
      case 'INSTANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Instant (&lt;16ms)
          </span>
        )
      case 'ACCEPTABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Acceptable (&lt;200ms)
          </span>
        )
      case 'DEGRADED_SLA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded SLA
          </span>
        )
      case 'TIMEOUT_RISK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Timeout Risk (&gt;5s)
          </span>
        )
      case 'CRITICAL_FAILURE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Critical (&gt;60s)
          </span>
        )
      default:
        return null
    }
  }

  const formatLatency = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)} μs`
    if (ms < 1000) return `${ms.toFixed(2)} ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`
    return `${(ms / 60000).toFixed(2)} min`
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Asymptotic Scalability Projections
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Theoretical scaling model extrapolated from empirical regression: <code className="text-indigo-400 font-mono">{primaryModel.formula}</code>
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
          <Gauge className="w-3.5 h-3.5 text-indigo-400" />
          <span>Model: {primaryModel.complexityClass}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
              <th className="py-3 px-4">Input Size (N)</th>
              <th className="py-3 px-4 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Projected Latency
              </th>
              <th className="py-3 px-4">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Memory Footprint
                </span>
              </th>
              <th className="py-3 px-4">SLA Feasibility Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {projections.map((proj, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-200">
                  {proj.targetN.toLocaleString()}
                  <span className="text-[10px] text-slate-500 ml-1.5 font-normal">
                    (10^{Math.round(Math.log10(proj.targetN))})
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-100 font-semibold">
                  {formatLatency(proj.projectedTimeMs)}
                </td>
                <td className="py-3.5 px-4 text-slate-300">
                  {proj.projectedMemoryMb < 1 ? '< 1 MB' : `${proj.projectedMemoryMb} MB`}
                </td>
                <td className="py-3.5 px-4">
                  {getVerdictBadge(proj.feasibilityVerdict)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

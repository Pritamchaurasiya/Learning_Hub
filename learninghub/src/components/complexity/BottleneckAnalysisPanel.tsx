import React from 'react'
import { ProfilerResultPayload } from '../../types/complexity'
import { AlertTriangle, Lightbulb, Calculator, Clock, CheckCircle2, AlertOctagon } from 'lucide-react'

interface BottleneckAnalysisPanelProps {
  result: ProfilerResultPayload
}

export const BottleneckAnalysisPanel: React.FC<BottleneckAnalysisPanelProps> = ({ result }) => {
  const { bottleneckAnalysis, asymptoticProjections } = result

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'INSTANT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">INSTANT (&lt;16ms)</span>
      case 'ACCEPTABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">ACCEPTABLE SLA</span>
      case 'DEGRADED_SLA':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">DEGRADED SLA (&gt;200ms)</span>
      case 'TIMEOUT_RISK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">TIMEOUT RISK (&gt;5s)</span>
      case 'CRITICAL_FAILURE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">UNFEASIBLE (&gt;60s)</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">UNKNOWN</span>
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bottlenecks & Socratic Remediation */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Algorithmic Invariant & Bottleneck Diagnosis
          </h3>
          <p className="text-xs text-slate-400">
            Automated architectural inspection identifying computational ceilings and cache thrashing.
          </p>
        </div>

        {/* Anomalies */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            Detected Scale Anomalies
          </h4>
          <div className="space-y-2">
            {bottleneckAnalysis.detectedAnomalies.map((anomaly, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>{anomaly}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Suggestions */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-indigo-400" />
            Staff Engineer Optimization Scaffolding
          </h4>
          <div className="space-y-2">
            {bottleneckAnalysis.actionableSuggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200/90 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KaTeX Proof Formula */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Calculator className="w-4 h-4 text-cyan-400" />
            Mathematical Recurrence Relation
          </h4>
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto shadow-inner">
            <code>{bottleneckAnalysis.katexFormalProof}</code>
          </div>
        </div>
      </div>

      {/* Asymptotic Scale Projections Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-indigo-400" />
            Hypothetical Enterprise Scale Projections
          </h3>
          <p className="text-xs text-slate-400">
            Extrapolated latency and memory consumption when scaling to production workloads up to N = 1,000,000.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Input Scale (N)</th>
                <th className="py-2.5 px-3">Est. Latency</th>
                <th className="py-2.5 px-3">Est. Heap RAM</th>
                <th className="py-2.5 px-3 text-right">Production SLA Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {asymptoticProjections.map(proj => (
                <tr key={proj.targetN} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-200">
                    {proj.targetN.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-indigo-300">
                    {proj.projectedTimeMs >= 1000
                      ? `${(proj.projectedTimeMs / 1000).toFixed(2)} s`
                      : `${proj.projectedTimeMs.toFixed(2)} ms`}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {proj.projectedMemoryMb >= 1024
                      ? `${(proj.projectedMemoryMb / 1024).toFixed(2)} GB`
                      : `${proj.projectedMemoryMb.toFixed(1)} MB`}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {getVerdictBadge(proj.feasibilityVerdict)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <span className="text-indigo-400 font-bold shrink-0">Note:</span>
          <span>
            Projections are synthesized using least-squares non-linear extrapolation of the empirical model. Actual cloud production latency may be influenced by GC pauses, network round-trips, and concurrency contention.
          </span>
        </div>
      </div>
    </div>
  )
}

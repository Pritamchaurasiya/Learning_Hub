import React from 'react'
import { AlertTriangle, CheckCircle, Lightbulb, Sparkles } from 'lucide-react'
import { AnomalyReport } from '../../types/debugger'

interface InvariantAnomalyCardProps {
  anomalies: AnomalyReport[]
  onApplyFix?: (fix: string) => void
}

export const InvariantAnomalyCard: React.FC<InvariantAnomalyCardProps> = ({
  anomalies = [],
  onApplyFix,
}) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Algorithmic Invariants Verified
          </h4>
          <p className="text-xs text-slate-300">
            No infinite loops, off-by-one errors, or unbounded recursion detected across all execution steps.
          </p>
        </div>
      </div>
    )
  }

  const primary = anomalies[0]

  return (
    <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 shadow-lg space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {primary.type.replace(/_/g, ' ')}
            </span>
            <h4 className="text-sm font-bold text-white mt-1">
              Runtime Anomaly on Line {primary.line} (Step {primary.stepIndex + 1})
            </h4>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        {primary.description}
      </p>

      {/* Culprit Variables Snapshot */}
      {Object.keys(primary.culpritVariables).length > 0 && (
        <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/20 space-y-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
            Culprit Variable State:
          </span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(primary.culpritVariables).map(([k, v]) => (
              <span
                key={k}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-rose-300"
              >
                {k} = <span className="text-white font-bold">{JSON.stringify(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Socratic Scaffolding & Fix */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <Lightbulb className="w-4 h-4" />
          <span>Socratic Remediation & Recommended Fix</span>
        </div>
        <p className="text-xs text-slate-200">
          {primary.suggestedFix}
        </p>
        {primary.katexMathematicalScaffolding && (
          <div className="p-2 rounded-lg bg-slate-950/70 text-[11px] font-mono text-amber-300 border border-amber-500/20">
            {primary.katexMathematicalScaffolding}
          </div>
        )}
      </div>

      {onApplyFix && (
        <button
          type="button"
          onClick={() => onApplyFix(primary.suggestedFix)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Apply Scaffolded Fix to Editor</span>
        </button>
      )}
    </div>
  )
}

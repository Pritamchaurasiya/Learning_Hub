import React from 'react'
import { SelfHealingPatch } from '../../types/selfHealing'
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Gauge,
  Sparkles,
} from 'lucide-react'

interface PatchImpactScorecardProps {
  patch: SelfHealingPatch
  scoreBefore: number
  scoreAfter: number
}

export const PatchImpactScorecard: React.FC<PatchImpactScorecardProps> = ({
  patch,
  scoreBefore,
  scoreAfter,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Header & Verdict */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Remediation Impact & Safety Audit
            </h4>
            <p className="text-xs text-slate-400">Pre-flight regression analysis and quality delta.</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{patch.safetyVerdict}</span>
        </span>
      </div>

      {/* Health Score Comparison */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Codebase Reliability Index</span>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold">{scoreBefore}%</span>
            <span className="text-slate-500">→</span>
            <span className="text-emerald-400 font-bold text-sm">{scoreAfter}%</span>
            <span className="text-[10px] text-emerald-400 font-normal">(+{scoreAfter - scoreBefore}%)</span>
          </div>
        </div>

        <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex">
          <div className="bg-rose-500 h-full" style={{ width: `${scoreBefore}%` }} />
          <div className="bg-emerald-500 h-full" style={{ width: `${scoreAfter - scoreBefore}%` }} />
        </div>
      </div>

      {/* Tri-Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Latency Reduction */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Latency Drop
          </span>
          <div className="text-base font-bold text-amber-400 font-mono">
            -{patch.estimatedLatencyReductionPct}%
          </div>
        </div>

        {/* Security Posture */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Security Gain
          </span>
          <div className="text-base font-bold text-emerald-400 font-mono">
            +{patch.securityPostureImprovementPct}%
          </div>
        </div>

        {/* Cyclomatic Complexity */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3 text-sky-400" /> Complexity
          </span>
          <div className="text-sm font-bold text-sky-400 font-mono">
            {patch.cyclomaticComplexityBefore} → {patch.cyclomaticComplexityAfter}
          </div>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="space-y-2 pt-1 border-t border-slate-800">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
          Automated Safety Verification Checklist
        </span>
        <ul className="space-y-1.5">
          {patch.verificationChecklist.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

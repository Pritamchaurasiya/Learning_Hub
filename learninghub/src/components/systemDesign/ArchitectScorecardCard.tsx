import React from 'react'
import { SimulationTelemetryResult } from '../../types/systemDesign'
import {
  Award,
  ShieldAlert,
  Wrench,
  BookOpen,
  Sparkles,
} from 'lucide-react'

interface ArchitectScorecardCardProps {
  scorecard: SimulationTelemetryResult['architecturalScorecard']
  socraticCritique: SimulationTelemetryResult['socraticCritique']
  spofNodeIds: string[]
}

export const ArchitectScorecardCard: React.FC<ArchitectScorecardCardProps> = ({
  scorecard,
  socraticCritique,
  spofNodeIds,
}) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
      case 'B':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40'
      case 'C':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      case 'F':
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
      {/* Top Header & Grade Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">System Architecture Evaluation Scorecard</h3>
            <p className="text-xs text-slate-400">{socraticCritique.architectPersona}</p>
          </div>
        </div>

        <div className={`px-4 py-1.5 rounded-xl text-lg font-black font-mono border ${getGradeColor(scorecard.overallGrade)}`}>
          Grade {scorecard.overallGrade}
        </div>
      </div>

      {/* Tri-Factor Score Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-400 font-mono">Scalability</span>
          <div className="text-base font-bold text-sky-400 font-mono">{scorecard.scalabilityScore}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${scorecard.scalabilityScore}%` }} />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-400 font-mono">Resilience</span>
          <div className="text-base font-bold text-emerald-400 font-mono">{scorecard.resilienceScore}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${scorecard.resilienceScore}%` }} />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
          <span className="text-[11px] text-slate-400 font-mono">Cost Efficiency</span>
          <div className="text-base font-bold text-indigo-400 font-mono">{scorecard.costEfficiencyScore}%</div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${scorecard.costEfficiencyScore}%` }} />
          </div>
        </div>
      </div>

      {/* Detected Vulnerabilities & SPOF Alerts */}
      {(scorecard.detectedVulnerabilities.length > 0 || spofNodeIds.length > 0) && (
        <div className="space-y-2 bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl">
          <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Identified Architectural Vulnerabilities ({scorecard.detectedVulnerabilities.length + (spofNodeIds.length > 0 ? 1 : 0)})</span>
          </span>
          <ul className="space-y-1.5 text-xs text-rose-200/90 list-disc list-inside">
            {spofNodeIds.length > 0 && (
              <li>Unmitigated Single Point of Failure (SPOF) detected on node(s): <span className="font-mono text-purple-300">{spofNodeIds.join(', ')}</span>.</li>
            )}
            {scorecard.detectedVulnerabilities.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Mitigations */}
      {scorecard.recommendedMitigations.length > 0 && (
        <div className="space-y-2 bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span>Recommended Engineering Mitigations</span>
          </span>
          <ul className="space-y-1.5 text-xs text-emerald-200/90 list-disc list-inside">
            {scorecard.recommendedMitigations.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Socratic Deep Architecture Critique */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Socratic Mathematical Proof & Queueing Dynamics</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {socraticCritique.critiqueSummary}
        </p>

        {/* Mathematical Formulas */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-mono text-slate-400 block flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Theoretical Invariants:
          </span>
          <div className="space-y-1 font-mono text-xs text-amber-300/90 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            {socraticCritique.katexFormulas.map((f, i) => (
              <div key={i} className="tracking-wide">
                $$ {f} $$
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

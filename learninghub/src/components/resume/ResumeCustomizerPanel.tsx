import React from 'react'
import { TargetRole, ATSScoreBreakdown } from '../../types/resume'
import { Sparkles, CheckCircle, AlertCircle, Cpu, Code2, Layers, Network } from 'lucide-react'

interface ResumeCustomizerPanelProps {
  selectedRole: TargetRole
  onRoleChange: (role: TargetRole) => void
  atsScoring: ATSScoreBreakdown
}

export const ResumeCustomizerPanel: React.FC<ResumeCustomizerPanelProps> = ({
  selectedRole,
  onRoleChange,
  atsScoring,
}) => {
  const roles: { id: TargetRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'FULL_STACK_LEAD',
      label: 'Full Stack Lead',
      icon: <Layers className="w-4 h-4" />,
      desc: 'React, Node, WebSockets, Postgres & Testing',
    },
    {
      id: 'SYSTEMS_ARCHITECT',
      label: 'Systems Architect',
      icon: <Network className="w-4 h-4" />,
      desc: 'Distributed Systems, BullMQ, Redis, Sub-10ms Latency',
    },
    {
      id: 'ALGORITHM_ENGINEER',
      label: 'Algorithm Specialist',
      icon: <Code2 className="w-4 h-4" />,
      desc: 'Grandmaster Elo, Dynamic Programming, O(1) Complexity',
    },
    {
      id: 'ML_DATA_ENGINEER',
      label: 'ML Systems Engineer',
      icon: <Cpu className="w-4 h-4" />,
      desc: 'Bayesian Knowledge Tracing, Probabilistic Models',
    },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (score >= 80) return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    return 'text-red-400 bg-red-500/10 border-red-500/30'
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Role Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Role-Targeted Tailoring Engine
            </h3>
          </div>
          <span className="text-xs text-slate-400">Auto-injects target ATS keywords</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {roles.map(role => {
            const isSelected = selectedRole === role.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onRoleChange(role.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs">
                  <span className={isSelected ? 'text-emerald-400' : 'text-slate-400'}>{role.icon}</span>
                  <span>{role.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{role.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ATS Scorer Card */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Applicant Tracking System (ATS) Compatibility
          </h4>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getScoreColor(
              atsScoring.overallScore
            )}`}
          >
            <span>{atsScoring.overallScore}/100</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30">Grade {atsScoring.grade}</span>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-2.5 text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Quantified Metrics & Impact</span>
              <span className="text-slate-200 font-medium">
                {atsScoring.criteriaScores.quantifiedMetricsScore}/25
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(atsScoring.criteriaScores.quantifiedMetricsScore / 25) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Commanding Action Verbs</span>
              <span className="text-slate-200 font-medium">{atsScoring.criteriaScores.actionVerbsScore}/25</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${(atsScoring.criteriaScores.actionVerbsScore / 25) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Role-Specific Keyword Density</span>
              <span className="text-slate-200 font-medium">
                {atsScoring.criteriaScores.keywordOptimizationScore}/25
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(atsScoring.criteriaScores.keywordOptimizationScore / 25) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Format & Parser Compliance</span>
              <span className="text-slate-200 font-medium">
                {atsScoring.criteriaScores.formattingComplianceScore}/25
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(atsScoring.criteriaScores.formattingComplianceScore / 25) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Detected Keywords Chips */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
            Detected High-Value Keywords:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {atsScoring.detectedKeywords.map(kw => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Actionable Feedback */}
        {atsScoring.actionableFeedback.length > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Recruiter & ATS Optimization Insights:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              {atsScoring.actionableFeedback.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

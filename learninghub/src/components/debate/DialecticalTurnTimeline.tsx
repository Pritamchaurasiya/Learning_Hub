import React from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
} from 'lucide-react'
import { DebateTurn, DebatePersonaId } from '../../types/agentDebate'

interface DialecticalTurnTimelineProps {
  turns: DebateTurn[]
  activeTurnIndex?: number
  onSelectTurn?: (index: number) => void
}

export const DialecticalTurnTimeline: React.FC<DialecticalTurnTimelineProps> = ({
  turns,
  activeTurnIndex,
  onSelectTurn,
}) => {
  const getPersonaColor = (id: DebatePersonaId) => {
    switch (id) {
      case 'ARCHITECT_AVA':
        return '#6366F1'
      case 'SENTINEL_REX':
        return '#EF4444'
      case 'VELOCITY_VIK':
        return '#F59E0B'
      case 'CHAOS_CHLOE':
        return '#10B981'
      default:
        return '#8B5CF6'
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            <ShieldAlert className="w-3 h-3" /> Critical Risk
          </span>
        )
      case 'WARNING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Trade-off Warning
          </span>
        )
      case 'ENDORSEMENT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Endorsed Mitigation
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20">
            <HelpCircle className="w-3 h-3" /> Invariant Claim
          </span>
        )
    }
  }

  if (turns.length === 0) {
    return (
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
        <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="text-sm">Initiate the debate session to stream dialectical turns from the council.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Dialectical Discourse & Rebuttal Stream ({turns.length} turns)
        </h3>
        <span className="text-xs text-slate-500 font-mono">Real-time Adversarial Argumentation</span>
      </div>

      <div className="space-y-4">
        {turns.map((turn, index) => {
          const isSelected = activeTurnIndex === index
          const personaColor = getPersonaColor(turn.personaId)

          return (
            <div
              key={turn.id}
              onClick={() => onSelectTurn?.(index)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Turn Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full ring-4 ring-slate-800"
                    style={{ backgroundColor: personaColor }}
                  />
                  <span className="font-bold text-white text-sm">{turn.personaName}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Round {turn.roundIndex}
                  </span>

                  {turn.rebuttalTargetPersonaId && (
                    <div className="flex items-center gap-1 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <span>Rebuttal to</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>{turn.rebuttalTargetPersonaId.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span>Sec: {turn.scoreContribution.security}</span>
                  <span>•</span>
                  <span>Perf: {turn.scoreContribution.performance}</span>
                  <span>•</span>
                  <span>Rel: {turn.scoreContribution.reliability}</span>
                </div>
              </div>

              {/* Critique Statement */}
              <div className="text-slate-200 text-sm leading-relaxed mb-3.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 font-sans">
                {turn.critique}
              </div>

              {/* Claims & Grounded Evidence */}
              {turn.claims.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  {turn.claims.map((claim) => (
                    <div
                      key={claim.id}
                      className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-300">{claim.claim}</span>
                        {getSeverityBadge(claim.severity)}
                      </div>
                      <div className="text-slate-400 text-[11px] font-mono flex items-start gap-1.5">
                        <span className="text-indigo-400 font-bold shrink-0">Grounding:</span>
                        <span>{claim.evidence}</span>
                      </div>
                      {claim.counterExample && (
                        <div className="text-rose-400/90 text-[11px] font-mono bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10">
                          <span className="font-bold">Counterexample:</span> {claim.counterExample}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

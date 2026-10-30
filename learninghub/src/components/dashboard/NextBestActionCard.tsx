import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Zap, Target, Clock } from 'lucide-react'
import { Card } from '../ui/Card'
import type { NextBestAction } from '../../services/dashboardService'

interface Props {
  action: NextBestAction
  personalized?: boolean
}

export function NextBestActionCard({ action, personalized }: Props) {
  const navigate = useNavigate()
  const isPersonalized = Boolean(action.personalized ?? personalized)

  return (
    <Card className="relative overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 p-6 text-white shadow-2xl">
      <div className="pointer-events-none absolute -right-6 -top-6 opacity-10" aria-hidden="true">
        <Sparkles className="h-40 w-40 text-indigo-300" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
              {isPersonalized ? 'Personalized Diagnostic Action' : 'Suggested Next Step'}
            </span>
            {action.multiplierBonus && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Zap className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                {action.multiplierBonus}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-200/80">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              About {action.estimatedMinutes} mins
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight leading-snug">
              {action.title}
            </h3>
            <p className="text-xs sm:text-sm text-indigo-200/90 font-normal leading-relaxed">
              {action.reason}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => navigate(action.actionUrl)}
            className="min-h-[44px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Target className="w-4 h-4" aria-hidden="true" />
            <span>{action.actionLabel}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  )
}

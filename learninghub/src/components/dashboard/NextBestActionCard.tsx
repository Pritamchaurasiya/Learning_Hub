import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Target, Clock } from 'lucide-react'
import { Card } from '../ui/Card'
import type { NextBestAction } from '../../services/dashboardService'

interface Props {
  action: NextBestAction
  personalized?: boolean
}

export function NextBestActionCard({ action, personalized = false }: Props) {
  const navigate = useNavigate()

  return (
    <Card className="relative overflow-hidden border border-indigo-500/25 bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 p-5 text-white shadow-xl shadow-indigo-950/10 sm:p-6">
      <div className="pointer-events-none absolute -right-4 -top-7 opacity-[0.08]" aria-hidden="true">
        <Sparkles className="h-36 w-36 text-indigo-300" />
      </div>
      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-100">
            <Sparkles className="h-3.5 w-3.5 text-violet-200" aria-hidden="true" />
            {personalized ? 'Skill-based recommendation' : 'Suggested next step'}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold leading-snug tracking-tight text-white sm:text-xl">
              {action.title}
            </h3>
            <p className="max-w-xl text-sm leading-relaxed text-indigo-100/80">{action.reason}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch">
          <div className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-indigo-100 sm:self-center md:self-auto">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            About {action.estimatedMinutes} minutes
          </div>
          <button
            type="button"
            onClick={() => navigate(action.actionUrl)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-indigo-950 shadow-lg shadow-black/10 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950"
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            <span>{action.actionLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Card>
  )
}

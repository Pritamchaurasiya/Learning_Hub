import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Zap, Target } from 'lucide-react'
import { Card } from '../ui/Card'
import type { NextBestAction } from '../../services/dashboardService'

interface Props {
  action: NextBestAction
}

export function NextBestActionCard({ action }: Props) {
  const navigate = useNavigate()

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-purple-950 text-white relative overflow-hidden shadow-2xl border border-indigo-500/30">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <Sparkles className="w-36 h-36 text-indigo-400" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              AI Recommended Action
            </span>
            {action.multiplierBonus && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                {action.multiplierBonus}
              </span>
            )}
            <span className="text-xs font-medium text-indigo-200/80 flex items-center gap-1">
              • Est. {action.estimatedMinutes} mins
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
            {action.title}
          </h2>
          <p className="text-xs text-indigo-200/90 font-normal leading-relaxed">{action.reason}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <button
            onClick={() => navigate(action.actionUrl)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-102 active:scale-98"
          >
            <Target className="w-4 h-4" />
            <span>{action.actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

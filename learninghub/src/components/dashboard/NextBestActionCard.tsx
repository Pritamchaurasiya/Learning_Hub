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
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-300" />
              AI Next Best Action
            </span>
            {action.multiplierBonus && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-300" />
                {action.multiplierBonus}
              </span>
            )}
          </div>
          <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
            {action.title}
          </h3>
          <p className="text-xs text-indigo-200/80 font-medium leading-relaxed">{action.reason}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="text-right hidden md:block">
            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-300 block">
              Est. Time
            </span>
            <span className="text-sm font-black text-white">{action.estimatedMinutes} mins</span>
          </div>
          <button
            onClick={() => navigate(action.actionUrl)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95"
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

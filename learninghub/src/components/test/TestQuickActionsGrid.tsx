import { memo } from 'react'
import { Zap, Layers, BookMarked, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TestQuickActionsGridProps {
  onLaunchBlitz: () => void
  onOpenFlashcards: () => void
  onOpenMistakes: () => void
  onOpenAdaptiveDrill: () => void
}

export const TestQuickActionsGrid = memo(function TestQuickActionsGrid({
  onLaunchBlitz,
  onOpenFlashcards,
  onOpenMistakes,
  onOpenAdaptiveDrill,
}: TestQuickActionsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* 1. 60-Second Blitz */}
      <div className="group relative rounded-2xl border border-emerald-500/30 dark:border-emerald-500/40 bg-white/85 dark:bg-gradient-to-br dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              High Speed
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
            60-Second Blitz
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
            10 rapid-fire questions against the clock. Boost instant recall and calculation speed.
          </p>
        </div>
        <Button
          onClick={onLaunchBlitz}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-950 shadow-md shadow-emerald-500/25"
        >
          <span>Launch Blitz</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 2. 3D Spaced Flashcards */}
      <div className="group relative rounded-2xl border border-blue-500/30 dark:border-blue-500/40 bg-white/85 dark:bg-gradient-to-br dark:from-blue-950/20 dark:via-slate-900/40 dark:to-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
              Active Recall
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            Spaced Flashcards
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
            3D interactive flip cards with Leitner spaced repetition. Lock formulas into long-term
            memory.
          </p>
        </div>
        <Button
          onClick={onOpenFlashcards}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white dark:text-slate-950 shadow-md shadow-blue-500/25"
        >
          <span>Review Cards</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 3. Mistake Notebook */}
      <div className="group relative rounded-2xl border border-purple-500/30 dark:border-purple-500/40 bg-white/85 dark:bg-gradient-to-br dark:from-purple-950/20 dark:via-slate-900/40 dark:to-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BookMarked className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
              Cognitive Fix
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
            Mistake Notebook
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
            Zero in on past missed questions. Tag silly mistakes, rushing, and concept holes.
          </p>
        </div>
        <Button
          onClick={onOpenMistakes}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25"
        >
          <span>Open Notebook</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 4. AI Adaptive Practice */}
      <div className="group relative rounded-2xl border border-amber-500/30 dark:border-amber-500/40 bg-white/85 dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-slate-900/40 dark:to-slate-900/60 p-5 backdrop-blur-md flex flex-col justify-between hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 shadow-sm transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              CAT Engine
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
            AI Adaptive Drill
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
            IRT Item Response Theory engine calibrates each question live based on your cognitive ability.
          </p>
        </div>
        <Button
          onClick={onOpenAdaptiveDrill}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white dark:text-slate-950 shadow-md shadow-amber-500/25"
        >
          <span>Start Drill</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
})


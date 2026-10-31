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
      <div className="group relative rounded-2xl border border-emerald-500/30 dark:border-emerald-500/40 bg-white/90 dark:bg-slate-900/90 p-5 backdrop-blur-md flex flex-col justify-between hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-950/40 shadow-sm dark:shadow-md transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/40 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/50">
              High Speed
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
            60-Second Blitz
          </h2>
          <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
            10 rapid-fire questions against the clock. Boost instant recall and calculation speed.
          </p>
        </div>
        <Button
          onClick={onLaunchBlitz}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-all"
        >
          <span>Launch Blitz</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 2. 3D Spaced Flashcards */}
      <div className="group relative rounded-2xl border border-blue-500/30 dark:border-blue-500/40 bg-white/90 dark:bg-slate-900/90 p-5 backdrop-blur-md flex flex-col justify-between hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-950/40 shadow-sm dark:shadow-md transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/40 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-500/30 dark:border-blue-500/50">
              Active Recall
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            Spaced Flashcards
          </h2>
          <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
            3D interactive flip cards with Leitner spaced repetition. Lock formulas into long-term
            memory.
          </p>
        </div>
        <Button
          onClick={onOpenFlashcards}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 transition-all"
        >
          <span>Review Cards</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 3. Mistake Notebook */}
      <div className="group relative rounded-2xl border border-purple-500/30 dark:border-purple-500/40 bg-white/90 dark:bg-slate-900/90 p-5 backdrop-blur-md flex flex-col justify-between hover:border-purple-500/60 dark:hover:border-purple-400/60 hover:shadow-xl hover:shadow-purple-500/10 dark:hover:shadow-purple-950/40 shadow-sm dark:shadow-md transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/40 flex items-center justify-center shrink-0">
              <BookMarked className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-500/30 dark:border-purple-500/50">
              Cognitive Fix
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
            Mistake Notebook
          </h2>
          <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
            Zero in on past missed questions. Tag silly mistakes, rushing, and concept holes.
          </p>
        </div>
        <Button
          onClick={onOpenMistakes}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25 transition-all"
        >
          <span>Open Notebook</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 4. AI Adaptive Practice */}
      <div className="group relative rounded-2xl border border-amber-500/30 dark:border-amber-500/40 bg-white/90 dark:bg-slate-900/90 p-5 backdrop-blur-md flex flex-col justify-between hover:border-amber-500/60 dark:hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-500/10 dark:hover:shadow-amber-950/40 shadow-sm dark:shadow-md transition-all duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/50">
              CAT Engine
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
            AI Adaptive Drill
          </h2>
          <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
            IRT Item Response Theory engine calibrates each question live based on your cognitive
            ability.
          </p>
        </div>
        <Button
          onClick={onOpenAdaptiveDrill}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 transition-all"
        >
          <span>Start Drill</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
})

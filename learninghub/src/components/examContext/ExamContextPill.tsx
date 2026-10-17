import React from 'react'
import { Target, ChevronDown } from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'

interface ExamContextPillProps {
  onClick: () => void
  className?: string
}

export const ExamContextPill: React.FC<ExamContextPillProps> = ({ onClick, className = '' }) => {
  const activeExam = useLearningContextStore(s => s.activeExam)
  const isConfigured = useLearningContextStore(s => s.isConfigured)
  const activeSubjects = useLearningContextStore(s => s.activeSubjects)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Change target exam context"
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
        isConfigured && activeExam
          ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 shadow-sm'
          : 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border-amber-500/40 hover:border-amber-500/60 animate-pulse'
      } ${className}`}
    >
      <Target
        className={`w-3.5 h-3.5 ${
          isConfigured ? 'text-emerald-400 group-hover:scale-110' : 'text-amber-400'
        } transition-transform`}
      />

      <span className="truncate max-w-[140px] sm:max-w-[180px] font-semibold">
        {isConfigured && activeExam ? activeExam.name : 'Select Target Exam'}
      </span>

      {isConfigured && activeSubjects.length > 0 && (
        <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
          {activeSubjects.length} {activeSubjects.length === 1 ? 'Sub' : 'Subs'}
        </span>
      )}

      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-colors" />
    </button>
  )
}

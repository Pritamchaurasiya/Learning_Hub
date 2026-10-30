import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, BookOpen, RotateCcw, Target, Sparkles, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { TestBlitzModal } from '../test/TestBlitzModal'
import { CatAdaptiveModal } from '../test/CatAdaptiveModal'
import { useLearningContextStore } from '../../stores/useLearningContextStore'

interface SmartLearningToolsWidgetProps {
  onOpenCatModal?: () => void
  onOpenBlitzModal?: () => void
}

export const SmartLearningToolsWidget: React.FC<SmartLearningToolsWidgetProps> = () => {
  const navigate = useNavigate()
  const [isBlitzOpen, setIsBlitzOpen] = useState(false)
  const [isCatOpen, setIsCatOpen] = useState(false)

  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeSubjects = useLearningContextStore(s => s.activeSubjects)

  const examSlug = activeExam?.slug || 'jee-main'
  const primarySubject = activeSubjects[0]?.name

  const tools = [
    {
      id: 'tool-blitz',
      title: '60s Test Blitz',
      tagline: 'High-speed rapid fire',
      description: 'Quick-fire 60-second knowledge sprint to test conceptual reaction time.',
      icon: Zap,
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'border-amber-500/30 hover:border-amber-400',
      iconColor: 'text-amber-400 bg-amber-500/10',
      badge: 'Rapid Fire',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      actionLabel: 'Launch Blitz',
      onClick: () => setIsBlitzOpen(true),
    },
    {
      id: 'tool-flashcards',
      title: 'Spaced Flashcards',
      tagline: 'SuperMemo SM-2 memory',
      description: 'Algorithmically timed active-recall flashcards to build long-term retention.',
      icon: BookOpen,
      gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent',
      borderColor: 'border-indigo-500/30 hover:border-indigo-400',
      iconColor: 'text-indigo-400 bg-indigo-500/10',
      badge: 'Memory Deck',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      actionLabel: 'Open Flashcards',
      onClick: () => navigate('/revision'),
    },
    {
      id: 'tool-mistakes',
      title: 'Mistake Notebook',
      tagline: 'Zero repeat errors',
      description:
        'Consolidated review deck of every question you flagged or missed in past tests.',
      icon: RotateCcw,
      gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
      borderColor: 'border-rose-500/30 hover:border-rose-400',
      iconColor: 'text-rose-400 bg-rose-500/10',
      badge: 'Remediation',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      actionLabel: 'Review Mistakes',
      onClick: () => navigate('/revision?filter=MISTAKE'),
    },
    {
      id: 'tool-adaptive',
      title: 'Adaptive CAT Drill',
      tagline: '3PL IRT dynamic difficulty',
      description:
        'Computerized Adaptive Test dynamically calibrates difficulty to your real-time ability.',
      icon: Target,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400',
      iconColor: 'text-emerald-400 bg-emerald-500/10',
      badge: 'Adaptive IRT',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      actionLabel: 'Launch Adaptive Drill',
      onClick: () => setIsCatOpen(true),
    },
  ]

  return (
    <div className="space-y-4" data-testid="smart-learning-tools-widget">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">
              Smart Learning Tools
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Verified active practice modules with zero simulated fluff
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map(tool => {
          const Icon = tool.icon
          return (
            <Card
              key={tool.id}
              className={`p-5 rounded-2xl bg-gradient-to-br ${tool.gradient} bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border ${tool.borderColor} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl ${tool.iconColor}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${tool.badgeColor}`}
                  >
                    {tool.badge}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                    {tool.title}
                  </h4>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                    {tool.tagline}
                  </p>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <button
                type="button"
                onClick={tool.onClick}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-xs font-black text-gray-900 dark:text-white flex items-center justify-center gap-1.5 transition-all group-hover:bg-indigo-600 group-hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>{tool.actionLabel}</span>
                <ArrowRight
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              </button>
            </Card>
          )
        })}
      </div>

      <TestBlitzModal isOpen={isBlitzOpen} onClose={() => setIsBlitzOpen(false)} />
      <CatAdaptiveModal
        isOpen={isCatOpen}
        onClose={() => setIsCatOpen(false)}
        initialExamSlug={examSlug}
        initialSubject={primarySubject}
      />
    </div>
  )
}

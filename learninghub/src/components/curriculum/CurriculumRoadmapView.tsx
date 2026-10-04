import { useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Cpu,
  Layers,
  Award,
  Zap,
  RotateCcw,
  PlusCircle,
  ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import {
  CurriculumPlan,
  CurriculumModule,
  EXAM_REGISTRY,
} from '../../types/curriculum'

interface CurriculumRoadmapViewProps {
  plan: CurriculumPlan
  onToggleConcept: (moduleId: string, conceptId: string) => Promise<void>
  onOpenGenerator: () => void
  onOpenRecalibrate: () => void
  onSyncToPlanner?: (module: CurriculumModule) => void
  isLoading?: boolean
}

export function CurriculumRoadmapView({
  plan,
  onToggleConcept,
  onOpenGenerator,
  onOpenRecalibrate,
  onSyncToPlanner,
  isLoading,
}: CurriculumRoadmapViewProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({
    [plan.modules[0]?.id || '']: true,
  })

  const toggleWeek = (moduleId: string) => {
    setExpandedWeeks(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const examMeta = EXAM_REGISTRY[plan.targetExam] || {
    name: plan.targetExam,
    badge: 'Custom',
    color: '#6366F1',
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Strategic Executive Summary Card ───────────────────── */}
      <Card className="p-6 bg-gradient-to-br from-indigo-900/10 via-purple-900/10 to-transparent border border-indigo-200/50 dark:border-indigo-800/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                {examMeta.name}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                {plan.pacingMode === 'INTENSIVE' ? '⚡ Intensive Track' : plan.pacingMode === 'BALANCED' ? '⚖️ Balanced Track' : '🌱 Steady Track'}
              </span>
              {plan.bufferWeeks > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  🛡️ {plan.bufferWeeks} Buffer Weeks Included
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {plan.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
              Target Deadline: <strong className="text-gray-800 dark:text-gray-200">{plan.targetDate}</strong> ({plan.weeksRemaining} weeks remaining) • {plan.weeklyStudyHours} hrs/week
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={onOpenRecalibrate}
              className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recalibrate Pacing
            </Button>
            <Button
              size="sm"
              disabled={isLoading}
              onClick={onOpenGenerator}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Syllabus
            </Button>
          </div>
        </div>

        {/* ── Key Metrics Bar ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-100 dark:border-indigo-900/40">
          <div>
            <div className="text-xs font-bold text-gray-400">Exam Readiness Score</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-baseline gap-1">
              {plan.estimatedReadinessScore}%
              <span className="text-[10px] font-normal text-gray-400">estimated</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${plan.estimatedReadinessScore}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-400">Curriculum Progress</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
              {plan.overallProgress}%
              <span className="text-[10px] font-normal text-gray-400">completed</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${plan.overallProgress}%` }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-400">Time Runway</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {plan.weeksRemaining} Weeks
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {plan.modules.length} modules total
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-400">Weekly Commitment</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {plan.weeklyStudyHours} hrs
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              ~{Math.round((plan.weeklyStudyHours / 7) * 10) / 10} hrs/day
            </div>
          </div>
        </div>

        {/* Recalibration Notes */}
        {plan.notes && (
          <div className="mt-4 p-3 rounded-xl bg-white/70 dark:bg-gray-900/60 border border-indigo-100 dark:border-indigo-900/40 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>{plan.notes}</span>
          </div>
        )}
      </Card>

      {/* ── 2. Multi-Week Modular Syllabus Timeline ───────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Week-by-Week Modular Roadmap
          </h3>
          <span className="text-xs text-gray-500">
            Click any week to inspect concepts & formulas
          </span>
        </div>

        <div className="space-y-3">
          {plan.modules.map(module => {
            const isExpanded = expandedWeeks[module.id] ?? false
            const isBuffer = module.domain === 'Synthesis & Review'
            const completedCount = module.concepts.filter(c => c.isCompleted).length
            const totalCount = module.concepts.length

            return (
              <div
                key={module.id}
                className={`rounded-2xl border transition-all ${
                  isBuffer
                    ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                    : module.status === 'COMPLETED'
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : module.status === 'IN_PROGRESS'
                    ? 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-gray-900 shadow-sm'
                    : 'border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/40'
                }`}
              >
                {/* Module Header Bar */}
                <div
                  onClick={() => toggleWeek(module.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                        module.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : module.status === 'IN_PROGRESS'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {module.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        `W${module.weekNumber}`
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-extrabold text-indigo-500 tracking-wider">
                          {module.domain}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            module.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : module.status === 'IN_PROGRESS'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {module.status === 'COMPLETED'
                            ? 'Completed'
                            : module.status === 'IN_PROGRESS'
                            ? 'Active Week'
                            : 'Upcoming'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white mt-0.5">
                        {module.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end text-xs">
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {completedCount}/{totalCount} concepts
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {module.targetHours}h budget
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Module Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 dark:border-gray-800/80 px-4 sm:px-6 py-4 space-y-4 overflow-hidden"
                    >
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {module.description}
                      </p>

                      {/* Concepts List */}
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                          Key Mastery Concepts & Formulas
                        </div>
                        <div className="space-y-2">
                          {module.concepts.map(concept => (
                            <div
                              key={concept.id}
                              className={`p-3 rounded-xl border transition-all ${
                                concept.isCompleted
                                  ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30'
                                  : 'bg-gray-50/70 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => onToggleConcept(module.id, concept.id)}
                                  className="flex items-start gap-2.5 text-left group"
                                >
                                  {concept.isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 mt-0.5 flex-shrink-0" />
                                  )}
                                  <div>
                                    <div
                                      className={`text-xs font-bold ${
                                        concept.isCompleted
                                          ? 'line-through text-gray-400 dark:text-gray-500'
                                          : 'text-gray-900 dark:text-white'
                                      }`}
                                    >
                                      {concept.name}
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-0.5">
                                      Estimated study: {concept.estimatedMinutes} mins • Target mastery: {concept.targetMastery}%
                                    </div>
                                  </div>
                                </button>
                              </div>

                              {/* KaTeX formula callout */}
                              {concept.formulaLatex && (
                                <div className="mt-2.5 p-2 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs font-mono text-indigo-900 dark:text-indigo-300">
                                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">
                                    Mathematical Invariant
                                  </div>
                                  <code>{concept.formulaLatex}</code>
                                </div>
                              )}

                              {/* Code snippet callout */}
                              {concept.codeSnippet && (
                                <div className="mt-2.5 p-2 rounded-lg bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    Reference Implementation ({concept.codeSnippet.language})
                                  </div>
                                  <pre className="text-[11px] leading-relaxed">
                                    {concept.codeSnippet.code}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Resource links & 1-Click Sync */}
                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {module.resourceLinks.map((res, i) => (
                            <a
                              key={i}
                              href={res.url}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 transition-colors"
                            >
                              {res.type === 'ebook' && <BookOpen className="w-3.5 h-3.5 text-blue-500" />}
                              {res.type === 'visualizer' && <Cpu className="w-3.5 h-3.5 text-purple-500" />}
                              {res.type === 'flashcard' && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                              {res.type === 'test' && <Award className="w-3.5 h-3.5 text-emerald-500" />}
                              <span>{res.title}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </a>
                          ))}
                        </div>

                        {onSyncToPlanner && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSyncToPlanner(module)}
                            className="text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Sync to Daily Planner
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

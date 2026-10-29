import { useState, useMemo, useEffect, memo } from 'react'
import {
  Search,
  Calendar,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  BookOpen,
  DownloadCloud,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import {
  TARGET_EXAMS_REGISTRY,
  OFFICIAL_PYQ_PAPERS,
} from '../../services/pyqData'
import type { TestA } from '../../services/testsAService'

export interface TargetExamPyqHubProps {
  onStartTest?: (test: TestA) => void
  onStartPyqPaper?: (test: TestA) => void
  onDownloadOffline?: (test: TestA) => void
  downloadingTestIds?: Set<string>
  offlineBundles?: Array<{ testId: string }>
}

export const TargetExamPyqHub = memo(function TargetExamPyqHub({
  onStartTest,
  onStartPyqPaper,
  onDownloadOffline,
  downloadingTestIds = new Set(),
  offlineBundles = [],
}: TargetExamPyqHubProps) {
  const handleStart = onStartPyqPaper || onStartTest || (() => {})
  const activeExam = useLearningContextStore(s => s.activeExam)

  // Calibrate initial selected exam to student's active context if available
  const [selectedExamSlug, setSelectedExamSlug] = useState<string>(() => {
    if (activeExam?.slug) {
      const match = TARGET_EXAMS_REGISTRY.find(
        e => e.slug === activeExam.slug || activeExam.slug.includes(e.slug) || e.slug.includes(activeExam.slug)
      )
      if (match) return match.slug
    }
    return 'all'
  })

  // Synchronize when student changes active exam in header / modal
  useEffect(() => {
    if (activeExam?.slug) {
      const match = TARGET_EXAMS_REGISTRY.find(
        e => e.slug === activeExam.slug || activeExam.slug.includes(e.slug) || e.slug.includes(activeExam.slug)
      )
      if (match) {
        setSelectedExamSlug(match.slug)
      }
    }
  }, [activeExam?.slug])

  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    OFFICIAL_PYQ_PAPERS.forEach(p => years.add(p.year))
    return Array.from(years).sort((a, b) => b - a)
  }, [])

  const filteredPapers = useMemo(() => {
    return OFFICIAL_PYQ_PAPERS.filter(paper => {
      if (selectedExamSlug !== 'all' && paper.examSlug !== selectedExamSlug) {
        return false
      }
      if (selectedYear !== 'all' && String(paper.year) !== selectedYear) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = paper.title.toLowerCase().includes(q)
        const matchDesc = paper.description.toLowerCase().includes(q)
        const matchShift = paper.shift.toLowerCase().includes(q)
        const matchExam = paper.examName.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchShift && !matchExam) {
          return false
        }
      }
      return true
    })
  }, [selectedExamSlug, selectedYear, searchQuery])

  const selectedExamMeta = useMemo(() => {
    if (selectedExamSlug === 'all') return null
    return TARGET_EXAMS_REGISTRY.find(e => e.slug === selectedExamSlug) || null
  }, [selectedExamSlug])


  return (
    <div className="w-full space-y-8" data-testid="target-exam-pyq-hub">
      {/* Hero Showcase Strip */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-900/60 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                OFFICIAL EXAM SIMULATOR
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-sm border border-white/10">
                100% Exact NTA / Official CBT Interface
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Target Exam PYQ Mock Station
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Practice authentic previous year question papers under exact examination conditions. Features real NTA 5-state question palettes, bilingual Hindi & English translations, shift percentile curves, and AI mistake diagnostics.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">100K+</div>
              <div className="text-[11px] font-medium text-slate-400 mt-0.5">Verified PYQs</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">100%</div>
              <div className="text-[11px] font-medium text-slate-400 mt-0.5">Real CBT Simulation</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <div className="text-xl sm:text-2xl font-black text-indigo-400 font-mono">Shift AIR</div>
              <div className="text-[11px] font-medium text-slate-400 mt-0.5">Historical Predictor</div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Exam Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Select Target Exam:
          </span>
          <span className="text-xs text-gray-500">
            {filteredPapers.length} {filteredPapers.length === 1 ? 'Paper Available' : 'Papers Available'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedExamSlug('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
              selectedExamSlug === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                : 'glass-subtle text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-slate-700/80 hover:bg-gray-100/80 dark:hover:bg-slate-800/80'
            }`}
          >
            <span>🎯 All Competitive Exams</span>
          </button>

          {TARGET_EXAMS_REGISTRY.map(exam => {
            const isSelected = selectedExamSlug === exam.slug
            return (
              <button
                key={exam.slug}
                type="button"
                onClick={() => setSelectedExamSlug(exam.slug)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                    : 'glass-subtle text-gray-700 dark:text-gray-300 border border-gray-200/80 dark:border-slate-700/80 hover:bg-gray-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <span>{exam.icon}</span>
                <span>{exam.shortName}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Exam Blueprint Banner (if exam is chosen) */}
      {selectedExamMeta && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedExamMeta.icon}</span>
              <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                {selectedExamMeta.name} • Official Test Blueprint
              </h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              {selectedExamMeta.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800">
              ⏱️ {selectedExamMeta.durationMinutesDefault} Mins
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800">
              🎯 {selectedExamMeta.totalMarksDefault} Marks
            </span>
            {selectedExamMeta.bilingualSupported && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                🌐 English & हिन्दी
              </span>
            )}
            {selectedExamMeta.virtualCalculatorAllowed && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                🧮 Calculator Allowed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by shift, year, subject (e.g. 27 Jan S1, Calculus, Physics)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            aria-label="Filter by exam year"
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
          >
            <option value="all">All Exam Years</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                {yr} Official Papers
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Official Papers Card Grid */}
      {filteredPapers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 space-y-2">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No official papers matched your filter</h4>
          <p className="text-xs text-gray-500">Try choosing a different year or exam category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map(paper => {
            const isOfflineCached = offlineBundles.some(b => b.testId === paper.id)
            const isDownloading = downloadingTestIds.has(paper.id)

            return (
              <Card
                key={paper.id}
                className="flex flex-col justify-between p-5 sm:p-6 bg-white/85 dark:bg-slate-900/75 backdrop-blur-xl border border-gray-200/70 dark:border-slate-800/80 rounded-3xl shadow-sm hover:shadow-2xl hover:border-indigo-400/60 dark:hover:border-indigo-500/60 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Top Badge Strip */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                      {paper.year} • {paper.shift}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        paper.difficultyRating === 'BRUTAL'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : paper.difficultyRating === 'TOUGH'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {paper.difficultyRating} Shift
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {paper.description}
                    </p>
                  </div>

                  {/* Key Exam Attributes */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{paper.timeLimitMinutes} Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <Award className="w-3.5 h-3.5 text-gray-400" />
                      <span>{paper.totalMarks} Marks</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                      <span>{paper.sections.length} Sections</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>NTA CBT Validated</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-5 mt-4 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  {onDownloadOffline && (
                    <button
                      type="button"
                      onClick={() => onDownloadOffline(paper as any)}
                      disabled={isOfflineCached || isDownloading}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        isOfflineCached
                          ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                      title={isOfflineCached ? 'Cached Offline' : 'Download for Offline Study'}
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isOfflineCached ? 'Cached' : isDownloading ? 'Saving...' : 'Offline'}
                      </span>
                    </button>
                  )}

                  <Button
                    onClick={() => handleStart(paper as any)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Start Official Mock CBT</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
})

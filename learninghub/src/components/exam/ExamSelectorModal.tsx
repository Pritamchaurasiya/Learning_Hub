import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Check,
  ChevronRight,
  Compass,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { fetchApi } from '../../utils/api'
import type {
  ActiveCountryInfo,
  ActiveExamInfo,
  ActiveSubjectInfo,
} from '../../types/learningContext'

interface ExamSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ApiCountry extends ActiveCountryInfo {
  exams?: Array<{
    id: string
    name: string
    slug: string
    description?: string | null
    subjects?: ActiveSubjectInfo[]
  }>
}

interface ApiExam extends ActiveExamInfo {
  subjects?: ActiveSubjectInfo[]
}

const CATEGORY_MAP: Record<string, string[]> = {
  'Government & Civil Services': ['ssc', 'upsc', 'banking', 'rrb', 'nda', 'cds', 'civil'],
  'Engineering & Medical': ['jee', 'neet', 'gate', 'bitsat', 'mcat'],
  'College & Global Entrance': ['sat', 'act', 'gre', 'gmat', 'a-level', 'toefl', 'ielts'],
  'Computer Science & Tech': ['dsa', 'swe', 'system-design', 'algorithms', 'software'],
}

function getExamCategory(exam: { name: string; slug: string }): string {
  const text = `${exam.name} ${exam.slug}`.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(k => text.includes(k))) {
      return category
    }
  }
  return 'Standardized & Academic'
}

export const ExamSelectorModal: React.FC<ExamSelectorModalProps> = ({ isOpen, onClose }) => {
  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeSubjectIds = useLearningContextStore(s => s.subjectIds)
  const switchExam = useLearningContextStore(s => s.switchExam)

  const [countries, setCountries] = useState<ApiCountry[]>([])
  const [exams, setExams] = useState<ApiExam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountryId, setSelectedCountryId] = useState<string>('all')

  // Two-step wizard view: 'browse' -> 'subjects'
  const [step, setStep] = useState<'browse' | 'subjects'>('browse')
  const [pendingExam, setPendingExam] = useState<ApiExam | null>(null)
  const [examSubjects, setExamSubjects] = useState<ActiveSubjectInfo[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch initial countries and all exams
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const loadTaxonomy = async () => {
      try {
        setLoading(true)
        setError(null)
        const [countriesRes, examsRes] = await Promise.all([
          fetchApi('/exam-content/countries'),
          fetchApi('/exam-content/exams'),
        ])

        if (!isMounted) return

        const countryList = Array.isArray(countriesRes.data)
          ? countriesRes.data
          : Array.isArray(countriesRes)
            ? countriesRes
            : []
        const examList = Array.isArray(examsRes.data)
          ? examsRes.data
          : Array.isArray(examsRes)
            ? examsRes
            : []

        setCountries(countryList)
        setExams(examList)
      } catch (err) {
        if (!isMounted) return
        console.error('[ExamSelector] Failed to fetch taxonomy:', err)
        setError('Failed to load exam catalog. Please check your connection.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadTaxonomy()
    setStep('browse')
    setSearchQuery('')

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Focus search input on open
  useEffect(() => {
    if (isOpen && step === 'browse') {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, step])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'subjects') {
          setStep('browse')
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, step, onClose])

  // Filter exams based on Search, Country, and Category
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCountry = selectedCountryId === 'all' || exam.countryId === selectedCountryId

      return matchesSearch && matchesCountry
    })
  }, [exams, searchQuery, selectedCountryId])

  // Group filtered exams by Category
  const groupedExams = useMemo(() => {
    const groups: Record<string, ApiExam[]> = {}
    for (const exam of filteredExams) {
      const cat = getExamCategory(exam)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(exam)
    }
    return groups
  }, [filteredExams])

  // Select an exam to configure subjects
  const handleSelectExam = async (exam: ApiExam) => {
    setPendingExam(exam)
    setLoadingSubjects(true)
    setStep('subjects')

    try {
      const res = await fetchApi(`/exam-content/exams/${exam.id}/subjects`)
      const subjects = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : (exam.subjects ?? [])

      setExamSubjects(subjects)
      // If this is currently the active exam, retain active subjects, else select all by default
      if (activeExam?.id === exam.id && activeSubjectIds.length > 0) {
        setSelectedSubjectIds(activeSubjectIds)
      } else {
        setSelectedSubjectIds(subjects.map((s: ActiveSubjectInfo) => s.id))
      }
    } catch {
      setExamSubjects(exam.subjects ?? [])
      setSelectedSubjectIds((exam.subjects ?? []).map(s => s.id))
    } finally {
      setLoadingSubjects(false)
    }
  }

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const handleSelectAllSubjects = () => {
    if (selectedSubjectIds.length === examSubjects.length) {
      setSelectedSubjectIds([])
    } else {
      setSelectedSubjectIds(examSubjects.map(s => s.id))
    }
  }

  const handleConfirmExam = async () => {
    if (!pendingExam) return

    const selectedSubjectObjects = examSubjects.filter(s => selectedSubjectIds.includes(s.id))

    await switchExam(pendingExam, selectedSubjectObjects)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-selector-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {step === 'subjects' ? (
                <button
                  onClick={() => setStep('browse')}
                  className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Back to exams"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <Compass className="w-5 h-5" />
                </div>
              )}
              <div>
                <h2
                  id="exam-selector-title"
                  className="text-lg font-bold text-slate-900 dark:text-white tracking-tight"
                >
                  {step === 'browse'
                    ? 'Select Your Target Exam'
                    : `Customize Subjects: ${pendingExam?.name}`}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {step === 'browse'
                    ? 'LearningHub aligns all tests, courses, practice, and weak-area analytics to this goal.'
                    : 'Choose the subjects you are preparing for in this exam cycle.'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          {step === 'browse' ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search exams (e.g., SSC CGL, JEE Main, NEET, SAT, GATE)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Country Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCountryId('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCountryId === 'all'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  🌍 All Countries
                </button>
                {countries.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCountryId(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCountryId === c.id
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{c.flagEmoji || '🏳️'}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Content List */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Loading exams catalog...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-center text-xs text-red-600 dark:text-red-400">
                  {error}
                </div>
              ) : Object.keys(groupedExams).length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    No matching exams found
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Try searching with another keyword or reset the country filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedExams).map(([category, catExams]) => (
                    <div key={category} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {category}
                        </span>
                        <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                        <span className="text-[11px] font-medium text-slate-400">
                          {catExams.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {catExams.map(exam => {
                          const isCurrentActive = activeExam?.id === exam.id
                          return (
                            <button
                              key={exam.id}
                              onClick={() => void handleSelectExam(exam)}
                              className={`group text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                                isCurrentActive
                                  ? 'border-primary-500/80 bg-primary-50/40 dark:bg-primary-950/20 ring-1 ring-primary-500/40'
                                  : 'border-slate-200/70 dark:border-slate-800 hover:border-primary-400/60 dark:hover:border-primary-600/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    {exam.name}
                                  </span>
                                  {isCurrentActive && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-600 text-white uppercase tracking-wider">
                                      Active
                                    </span>
                                  )}
                                </div>
                                {exam.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {exam.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 pt-0.5 text-[11px] text-slate-400">
                                  <span>{exam.subjects?.length ?? 0} subjects</span>
                                  <span>•</span>
                                  <span className="uppercase">{exam.slug}</span>
                                </div>
                              </div>

                              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Subject Customization */
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Select Subjects to Practice
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedSubjectIds.length} of {examSubjects.length} subjects selected
                  </p>
                </div>

                <button
                  onClick={handleSelectAllSubjects}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {selectedSubjectIds.length === examSubjects.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {loadingSubjects ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Loading exam curriculum...</p>
                </div>
              ) : examSubjects.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  This exam includes general curriculum content. All topics are activated.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {examSubjects.map(sub => {
                    const isSelected = selectedSubjectIds.includes(sub.id)
                    return (
                      <div
                        key={sub.id}
                        onClick={() => handleToggleSubject(sub.id)}
                        className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-primary-600 border-primary-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {sub.name}
                            </span>
                            {sub.topics && sub.topics.length > 0 && (
                              <p className="text-[11px] text-slate-400">
                                {sub.topics.length} topics covered
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {activeExam ? (
                <span>
                  Current Active:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">{activeExam.name}</strong>
                </span>
              ) : (
                <span>No active exam selected</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              {step === 'subjects' && (
                <button
                  onClick={() => void handleConfirmExam()}
                  disabled={selectedSubjectIds.length === 0 && examSubjects.length > 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-600/20 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Activate {pendingExam?.name}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

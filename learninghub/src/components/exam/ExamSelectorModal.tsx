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
  Globe,
  RefreshCw,
  Target,
  Sliders,
  Layers,
  Award,
  Zap,
} from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { useCountry } from '../../hooks/useCountry'
import { fetchApi } from '../../utils/api'
import {
  DEFAULT_COUNTRIES,
  DEFAULT_EXAMS,
  EXAM_CATEGORIES,
  getExamCategory,
  getCuratedSubjectsForExam,
  type CatalogExam,
  type ExamCategory,
} from '../../data/examCatalogData'
import type {
  ActiveCountryInfo,
  ActiveSubjectInfo,
  ExamDifficulty,
} from '../../types/learningContext'

interface ExamSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_SEARCH_CHIPS = [
  { label: '🔥 JEE Main', query: 'JEE Main' },
  { label: '🩺 NEET-UG', query: 'NEET' },
  { label: '🏛️ SSC CGL', query: 'SSC CGL' },
  { label: '🇮🇳 UPSC CSE', query: 'UPSC' },
  { label: '💻 Software & DSA', query: 'Software Engineering' },
  { label: '🎯 GATE CS', query: 'GATE' },
  { label: '💼 CAT MBA', query: 'CAT' },
  { label: '🎓 SAT', query: 'SAT' },
  { label: '🇬🇧 IELTS', query: 'IELTS' },
]

export const ExamSelectorModal: React.FC<ExamSelectorModalProps> = ({ isOpen, onClose }) => {
  const activeExam = useLearningContextStore(s => s.activeExam)
  const activeSubjectIds = useLearningContextStore(s => s.subjectIds)
  const storeDifficulty = useLearningContextStore(s => s.difficulty)
  const storeDailyGoal = useLearningContextStore(s => s.dailyGoal)
  const switchExam = useLearningContextStore(s => s.switchExam)
  const setDifficulty = useLearningContextStore(s => s.setDifficulty)
  const setDailyGoal = useLearningContextStore(s => s.setDailyGoal)
  const { countryId: globalCountryId, setCountry: setGlobalCountry } = useCountry()

  // Pre-load with curated offline-first data to ensure instant 0ms rendering
  const [countries, setCountries] = useState<ActiveCountryInfo[]>(DEFAULT_COUNTRIES)
  const [exams, setExams] = useState<CatalogExam[]>(DEFAULT_EXAMS)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOfflineFallback, setIsOfflineFallback] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountryId, setSelectedCountryId] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory>('All Categories')

  // Step 1: Browse -> Step 2: Subject & Target Calibration
  const [step, setStep] = useState<'browse' | 'subjects'>('browse')
  const [pendingExam, setPendingExam] = useState<CatalogExam | null>(null)
  const [examSubjects, setExamSubjects] = useState<ActiveSubjectInfo[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Target customization state
  const [chosenDifficulty, setChosenDifficulty] = useState<ExamDifficulty>(storeDifficulty || 'MEDIUM')
  const [chosenDailyGoal, setChosenDailyGoal] = useState<number>(storeDailyGoal || 15)
  const [targetYear, setTargetYear] = useState<string>('2026')
  const [isActivating, setIsActivating] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Align country with global provider on initial open
  useEffect(() => {
    if (!isOpen) return

    if (globalCountryId && globalCountryId !== 'all') {
      const match = DEFAULT_COUNTRIES.find(
        c => c.id === globalCountryId || c.code.toLowerCase() === globalCountryId.toLowerCase()
      )
      if (match) {
        setSelectedCountryId(match.id)
      }
    }
  }, [isOpen, globalCountryId])

  // Fetch / Sync taxonomy in the background without blocking the UI
  const syncTaxonomy = async (isManualRetry = false) => {
    try {
      setIsSyncing(true)
      if (isManualRetry) {
        setSyncMessage('Checking connection and syncing catalog...')
      }

      const [countriesRes, examsRes] = await Promise.all([
        fetchApi('/exam-content/countries').catch(() => null),
        fetchApi('/exam-content/exams').catch(() => null),
      ])

      const liveCountries = Array.isArray(countriesRes?.data)
        ? countriesRes.data
        : Array.isArray(countriesRes)
          ? countriesRes
          : []
      const liveExams = Array.isArray(examsRes?.data)
        ? examsRes.data
        : Array.isArray(examsRes)
          ? examsRes
          : []

      if (liveExams.length > 0) {
        // Merge with curated exams to maintain rich subjects and formatting
        const mergedExams = [...DEFAULT_EXAMS]
        for (const remote of liveExams) {
          const idx = mergedExams.findIndex(
            e => e.id === remote.id || e.slug === remote.slug
          )
          if (idx >= 0) {
            mergedExams[idx] = {
              ...mergedExams[idx],
              ...remote,
              subjects: remote.subjects && remote.subjects.length > 0 ? remote.subjects : mergedExams[idx].subjects,
            }
          } else {
            mergedExams.push({
              ...remote,
              subjects: remote.subjects || getCuratedSubjectsForExam(remote.id, remote.slug),
            })
          }
        }
        setExams(mergedExams)
        setIsOfflineFallback(false)
        if (isManualRetry) {
          setSyncMessage('Catalog synchronized successfully!')
          setTimeout(() => setSyncMessage(null), 3000)
        }
      } else {
        // Fallback active
        setIsOfflineFallback(true)
        if (isManualRetry) {
          setSyncMessage('Server offline. Curated offline catalog ready.')
          setTimeout(() => setSyncMessage(null), 4000)
        }
      }

      if (liveCountries.length > 0) {
        // Ensure "All Countries" remains at top
        const allOption: ActiveCountryInfo = { id: 'all', name: 'All Countries', code: 'ALL', flagEmoji: '🌍' }
        const mergedCountries = [allOption, ...liveCountries.filter((c: ActiveCountryInfo) => c.id !== 'all')]
        setCountries(mergedCountries)
      }
    } catch {
      // Graceful offline fallback
      setIsOfflineFallback(true)
      if (isManualRetry) {
        setSyncMessage('Working in offline mode with complete curated catalog.')
        setTimeout(() => setSyncMessage(null), 4000)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // Load when modal opens
  useEffect(() => {
    if (!isOpen) return
    void syncTaxonomy(false)
    setStep('browse')
    setSearchQuery('')
  }, [isOpen])

  // Focus search input on step change
  useEffect(() => {
    if (isOpen && step === 'browse') {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 80)
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
    const query = searchQuery.trim().toLowerCase()

    return exams.filter(exam => {
      // 1. Search Query Match
      const matchesSearch =
        query === '' ||
        exam.name.toLowerCase().includes(query) ||
        exam.slug.toLowerCase().includes(query) ||
        (exam.description && exam.description.toLowerCase().includes(query)) ||
        (exam.category && exam.category.toLowerCase().includes(query)) ||
        (exam.badge && exam.badge.toLowerCase().includes(query)) ||
        (exam.country?.name && exam.country.name.toLowerCase().includes(query))

      // 2. Country Match
      let matchesCountry = true
      if (selectedCountryId !== 'all') {
        const selectedCountry = countries.find(c => c.id === selectedCountryId)
        const countryCode = selectedCountry?.code?.toUpperCase()
        matchesCountry =
          exam.countryId === selectedCountryId ||
          (Boolean(countryCode) && exam.country?.code?.toUpperCase() === countryCode) ||
          (selectedCountryId === 'country-global' && exam.countryId === 'country-global')
      }

      // 3. Category Match
      const examCat = exam.category || getExamCategory(exam)
      const matchesCategory =
        selectedCategory === 'All Categories' || examCat === selectedCategory

      return matchesSearch && matchesCountry && matchesCategory
    })
  }, [exams, searchQuery, selectedCountryId, selectedCategory, countries])

  // Group filtered exams by Category for clean browsing
  const groupedExams = useMemo(() => {
    const groups: Record<string, CatalogExam[]> = {}
    for (const exam of filteredExams) {
      const cat = exam.category || getExamCategory(exam)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(exam)
    }
    return groups
  }, [filteredExams])

  // Count exams per country for badge indicator
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: exams.length }
    for (const exam of exams) {
      counts[exam.countryId] = (counts[exam.countryId] || 0) + 1
      if (exam.country?.code) {
        counts[exam.country.code.toLowerCase()] =
          (counts[exam.country.code.toLowerCase()] || 0) + 1
      }
    }
    return counts
  }, [exams])

  // Select an exam to configure subjects
  const handleSelectExam = async (exam: CatalogExam) => {
    setPendingExam(exam)
    setLoadingSubjects(true)
    setStep('subjects')

    // Start with curated subjects immediately
    const fallbackSubjects =
      exam.subjects && exam.subjects.length > 0
        ? exam.subjects
        : getCuratedSubjectsForExam(exam.id, exam.slug)
    setExamSubjects(fallbackSubjects)

    if (activeExam?.id === exam.id && activeSubjectIds.length > 0) {
      setSelectedSubjectIds(activeSubjectIds)
    } else {
      setSelectedSubjectIds(fallbackSubjects.map(s => s.id))
    }

    // Try fetching fresh subjects from API in the background
    try {
      const res = await fetchApi(`/exam-content/exams/${exam.id}/subjects`)
      const liveSubjects = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : []

      if (liveSubjects.length > 0) {
        setExamSubjects(liveSubjects)
        if (activeExam?.id === exam.id && activeSubjectIds.length > 0) {
          setSelectedSubjectIds(activeSubjectIds)
        } else {
          setSelectedSubjectIds(liveSubjects.map((s: ActiveSubjectInfo) => s.id))
        }
      }
    } catch {
      // Seamlessly retain curated fallback subjects
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

    try {
      setIsActivating(true)
      const selectedSubjectObjects = examSubjects.filter(s =>
        selectedSubjectIds.includes(s.id)
      )

      // 1. Activate exam and selected subjects
      await switchExam(pendingExam, selectedSubjectObjects)

      // 2. Set daily questions goal & difficulty calibration
      await setDifficulty(chosenDifficulty)
      await setDailyGoal(chosenDailyGoal)

      // 3. Dispatch global calibration event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lh:exam-calibrated', {
            detail: {
              exam: pendingExam,
              subjects: selectedSubjectObjects,
              dailyGoal: chosenDailyGoal,
              difficulty: chosenDifficulty,
              targetYear,
            },
          })
        )
      }

      onClose()
    } catch (err) {
      console.error('[ExamSelectorModal] Activation error:', err)
      onClose()
    } finally {
      setIsActivating(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md transition-opacity"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-selector-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden text-slate-900 dark:text-slate-100"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-3 sm:gap-3.5">
              {step === 'subjects' ? (
                <button
                  type="button"
                  onClick={() => setStep('browse')}
                  className="p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Back to exams"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-blue-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                  <Compass className="w-5 h-5 animate-pulse" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="exam-selector-title"
                    className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
                  >
                    {step === 'browse'
                      ? 'Select Your Target Exam'
                      : `Calibrate Subjects: ${pendingExam?.name}`}
                  </h2>

                  {/* Offline / Online sync indicator pill */}
                  {isOfflineFallback && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Zap className="w-3 h-3" />
                      Offline Ready
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  {step === 'browse'
                    ? 'LearningHub personalizes all mock tests, courses, practice sets, and weak-area AI to this goal.'
                    : 'Select the subjects you are targeting and set your study pace for this exam cycle.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sync / Refresh Button */}
              {step === 'browse' && (
                <button
                  type="button"
                  onClick={() => void syncTaxonomy(true)}
                  disabled={isSyncing}
                  title="Check connection and refresh exam catalog"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                  aria-label="Refresh catalog"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sync notification toast bar */}
          {syncMessage && (
            <div className="px-5 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>{syncMessage}</span>
              <button
                onClick={() => setSyncMessage(null)}
                className="text-indigo-500 hover:text-indigo-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Modal Body */}
          {step === 'browse' ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Search Bar with clear button */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search exams (e.g., JEE Main, NEET, SSC CGL, UPSC, Software & DSA, GATE, SAT, CAT)..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-900 dark:text-white shadow-inner"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hidden sm:block font-mono bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    ESC to close
                  </div>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" /> Popular:
                </span>
                {QUICK_SEARCH_CHIPS.map(chip => (
                  <button
                    key={chip.query}
                    type="button"
                    onClick={() => setSearchQuery(chip.query)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/40 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60 transition-colors whitespace-nowrap shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Country Tabs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="uppercase text-[10px] font-bold tracking-wider">Filter by Region</span>
                  <span>{filteredExams.length} exams available</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {countries.map(c => {
                    const isSelected = selectedCountryId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCountryId(c.id)
                          if (c.id !== 'all') {
                            void setGlobalCountry(c)
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="text-sm">{c.flagEmoji || '🏳️'}</span>
                        <span>{c.name}</span>
                        {c.id !== 'all' && countryCounts[c.id] !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {countryCounts[c.id]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {EXAM_CATEGORIES.map(category => {
                  const isSelected = selectedCategory === category
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>

              {/* Exam Catalog Cards List */}
              {filteredExams.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    No matching exams found
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery
                      ? `No exams matched "${searchQuery}". Try a different keyword or reset filters.`
                      : 'No exams currently match the selected region and category filters.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                    {(selectedCountryId !== 'all' || selectedCategory !== 'All Categories') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCountryId('all')
                          setSelectedCategory('All Categories')
                          setSearchQuery('')
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>View All Exams</span>
                      </button>
                    )}
                  </div>
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
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {catExams.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catExams.map(exam => {
                          const isCurrentActive = activeExam?.id === exam.id
                          return (
                            <button
                              key={exam.id}
                              type="button"
                              onClick={() => void handleSelectExam(exam)}
                              className={`group text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden ${
                                isCurrentActive
                                  ? 'border-indigo-500/80 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 shadow-md ring-1 ring-indigo-500/30'
                                  : 'border-slate-200/80 dark:border-slate-800/90 bg-white/60 dark:bg-slate-900/50 hover:border-indigo-400/80 dark:hover:border-indigo-500/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 shadow-sm hover:shadow-md'
                              }`}
                            >
                              {/* Top row: Name & Badges */}
                              <div className="space-y-1.5 w-full">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {exam.name}
                                    </span>
                                    {isCurrentActive && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        Active
                                      </span>
                                    )}
                                  </div>

                                  {exam.badge && (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                                      {exam.badge}
                                    </span>
                                  )}
                                </div>

                                {exam.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {exam.description}
                                  </p>
                                )}
                              </div>

                              {/* Footer Meta Row */}
                              <div className="w-full pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                    {exam.subjects?.length ?? 0} Subjects
                                  </span>

                                  {exam.country && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <span>{exam.country.flagEmoji || '🌐'}</span>
                                        <span>{exam.country.name}</span>
                                      </span>
                                    </>
                                  )}

                                  {exam.format && (
                                    <span className="hidden md:inline-flex px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                                      {exam.format}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                                  <span className="text-xs">Configure</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                              </div>
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
            /* Step 2: Subject & Target Goal Customization */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Exam Highlight Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200/70 dark:border-indigo-800/60 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{pendingExam?.country?.flagEmoji || '🎯'}</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {pendingExam?.name}
                    </h3>
                    {pendingExam?.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                        {pendingExam.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {pendingExam?.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('browse')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-white/80 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700/60 hover:bg-indigo-50 transition-colors shrink-0"
                >
                  Change Exam
                </button>
              </div>

              {/* Subject Selection Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Target Subjects to Master
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedSubjectIds.length} of {examSubjects.length} subjects active
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllSubjects}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
                >
                  {selectedSubjectIds.length === examSubjects.length
                    ? 'Deselect All'
                    : 'Select All Subjects'}
                </button>
              </div>

              {/* Subjects Grid */}
              {loadingSubjects ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Loading syllabus & curriculum...</p>
                </div>
              ) : examSubjects.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  This target exam covers full general curriculum. All question pools are enabled.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {examSubjects.map(sub => {
                    const isSelected = selectedSubjectIds.includes(sub.id)
                    return (
                      <div
                        key={sub.id}
                        onClick={() => handleToggleSubject(sub.id)}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                            </div>

                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {sub.name}
                            </span>
                          </div>

                          {sub.topics && sub.topics.length > 0 && (
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                              {sub.topics.length} topics
                            </span>
                          )}
                        </div>

                        {/* Topic Previews Chips */}
                        {sub.topics && sub.topics.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 pl-9">
                            {sub.topics.slice(0, 3).map(top => (
                              <span
                                key={top.id}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                              >
                                {top.name}
                              </span>
                            ))}
                            {sub.topics.length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{sub.topics.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Advanced Study Target Calibration */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-4 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Personalized Calibration Settings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Daily Question Target */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-indigo-500" />
                      Daily Questions Goal
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[10, 15, 25, 40].map(goal => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => setChosenDailyGoal(goal)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            chosenDailyGoal === goal
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Preference */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { key: 'MEDIUM', label: 'Balanced' },
                          { key: 'HARD', label: 'Hard' },
                          { key: 'ADAPTIVE', label: 'Adaptive' },
                        ] as const
                      ).map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setChosenDifficulty(item.key)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            chosenDifficulty === item.key
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Year */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-indigo-500" />
                      Target Exam Year
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['2026', '2027'].map(yr => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setTargetYear(yr)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                            targetYear === yr
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {yr} Cycle
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              {activeExam ? (
                <span>
                  Active Exam:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {activeExam.name}
                  </strong>
                </span>
              ) : (
                <span>No target exam currently active</span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              {step === 'subjects' && (
                <button
                  type="button"
                  onClick={() => void handleConfirmExam()}
                  disabled={
                    (selectedSubjectIds.length === 0 && examSubjects.length > 0) ||
                    isActivating
                  }
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isActivating
                      ? 'Calibrating...'
                      : `Activate ${pendingExam?.name || 'Target'}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

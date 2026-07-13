import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Globe,
  BookOpen,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Zap,
  Check,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { Button } from './ui/Button'
import { fetchApi } from '../utils/api'

interface Country {
  id: string
  name: string
  code: string
  flagEmoji?: string | null
  exams?: Array<{ id: string; name: string; slug: string }>
}

interface Exam {
  id: string
  name: string
  slug: string
  description?: string | null
  subjects?: Array<{ id: string; name: string; slug: string }>
}

interface Subject {
  id: string
  name: string
  slug: string
  topics?: Array<{ id: string; name: string; slug: string }>
}

export default function OnboardingWizard() {
  const location = useLocation()
  const auth = useStore(state => state.auth)
  const fetchMe = useStore(state => state.fetchMe)
  const addToast = useStore(state => state.addToast)
  const hasSeenOnboarding = useStore(state => state.hasSeenOnboarding)
  const setHasSeenOnboarding = useStore(state => state.setHasSeenOnboarding)

  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Data State
  const [countries, setCountries] = useState<Country[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)

  // Selection State
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [selectedExam, setSelectedExam] = useState<string>('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    'EASY' | 'MEDIUM' | 'HARD' | 'MIXED' | 'ADAPTIVE'
  >('MEDIUM')
  const [dailyGoal, setDailyGoal] = useState<number>(15)

  useEffect(() => {
    setIsHydrated(useStore.persist.hasHydrated())
    const unsubHydrate = useStore.persist.onFinishHydration(() => setIsHydrated(true))
    return () => {
      unsubHydrate()
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Disable in automated test environments
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      return
    }

    if (!auth.isAuthenticated || location.pathname === '/auth') {
      setIsOpen(false)
      return
    }

    // Trigger onboarding if user has not set their exam preference yet
    if (!hasSeenOnboarding && !auth.user?.examPreference) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        void loadCountries()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [
    auth.isAuthenticated,
    auth.user?.examPreference,
    hasSeenOnboarding,
    location.pathname,
    isHydrated,
  ])

  const loadCountries = async () => {
    try {
      setLoading(true)
      const res = await fetchApi('/exam-content/countries')
      if (res?.data) {
        setCountries(res.data)
      } else if (Array.isArray(res)) {
        setCountries(res)
      }
    } catch (err) {
      console.error('Failed to load countries', err)
    } finally {
      setLoading(false)
    }
  }

  const loadExams = async (countryId: string) => {
    try {
      setLoading(true)
      const res = await fetchApi(`/exam-content/exams?countryId=${countryId}`)
      const examData = res?.data ?? res
      if (Array.isArray(examData)) {
        setExams(examData)
      }
    } catch (err) {
      console.error('Failed to load exams', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjects = async (examId: string) => {
    try {
      setLoading(true)
      const res = await fetchApi(`/exam-content/exams/${examId}/subjects`)
      const subjectData = res?.data ?? res
      if (Array.isArray(subjectData)) {
        setSubjects(subjectData)
        // Automatically select all subjects by default
        setSelectedSubjects(subjectData.map(s => s.id))
      }
    } catch (err) {
      console.error('Failed to load subjects', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCountrySelect = (countryId: string) => {
    setSelectedCountry(countryId)
    setSelectedExam('')
    setSelectedSubjects([])
    setSubjects([])
    void loadExams(countryId)
  }

  const handleExamSelect = (examId: string) => {
    setSelectedExam(examId)
    setSelectedSubjects([])
    void loadSubjects(examId)
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const handleNext = () => {
    if (currentStep === 1 && !selectedExam) {
      addToast({ message: 'Please select an exam to proceed.', type: 'warning' })
      return
    }
    if (currentStep === 2 && selectedSubjects.length === 0) {
      addToast({ message: 'Please select at least one subject to practice.', type: 'warning' })
      return
    }
    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  const handleComplete = async () => {
    try {
      setLoading(true)
      await fetchApi('/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          countryId: selectedCountry || null,
          examId: selectedExam || null,
          subjectIds: selectedSubjects,
          difficulty: selectedDifficulty,
          dailyGoal,
        }),
      })

      addToast({ message: 'Study preferences synchronized successfully!', type: 'success' })
      setHasSeenOnboarding(true)
      setIsOpen(false)
      // Refresh profile to update UI context
      await fetchMe()
    } catch (err) {
      console.error('Failed to save preferences', err)
      addToast({ message: 'Failed to synchronize preferences. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    setHasSeenOnboarding(true)
    setIsOpen(false)
  }

  if (!isOpen || !isHydrated) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800"
        >
          {/* Header Progress */}
          <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-2">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === currentStep
                      ? 'w-8 bg-primary-500'
                      : i < currentStep
                        ? 'w-2 bg-emerald-500'
                        : 'w-2 bg-gray-200 dark:bg-gray-800'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-500 transition-colors flex items-center gap-1"
            >
              Skip <SkipForward className="w-3 h-3" />
            </button>
          </div>

          <div className="p-8 md:p-10 max-h-[70vh] overflow-y-auto">
            {/* STEP 0: Welcome Screen */}
            {currentStep === 0 && (
              <div className="space-y-6 text-center py-6">
                <div className="w-20 h-20 rounded-[2rem] bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-10 h-10 text-primary-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500">
                    Neural Engine Initialized
                  </p>
                  <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                    Welcome to the Practice Hub
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-base leading-relaxed">
                    Set up your target exam, focus subjects, and target difficulty. Our AI will
                    generate personalized mock tests to calibrate your performance.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 1: Country & Exam Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      Target Exam
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      Select exam and geographic context
                    </p>
                  </div>
                </div>

                {/* Country Grid */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Select Region
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {countries.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCountrySelect(c.id)}
                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                          selectedCountry === c.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 shadow-md shadow-primary-500/10'
                            : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{c.flagEmoji ?? '🏳️'}</span>
                        <span className="font-bold text-sm truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exams List */}
                {selectedCountry && (
                  <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Select Competitive Exam
                    </label>
                    {loading && exams.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-500">Loading exams...</div>
                    ) : exams.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {exams.map(e => (
                          <button
                            key={e.id}
                            onClick={() => handleExamSelect(e.id)}
                            className={`p-5 rounded-2xl border-2 transition-all text-left flex flex-col justify-between ${
                              selectedExam === e.id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 shadow-md shadow-primary-500/10'
                                : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-black text-base leading-tight">{e.name}</span>
                                {selectedExam === e.id && (
                                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                {e.description ?? 'Practice questions and mock tests'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-sm text-gray-500">
                        No active exams found for this region.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Subject Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      Focus Subjects
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      Select subjects you want to practice
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Available Subjects
                  </label>
                  {loading && subjects.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      Loading subjects...
                    </div>
                  ) : subjects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {subjects.map(s => {
                        const isSelected = selectedSubjects.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleSubject(s.id)}
                            className={`p-5 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10'
                                : 'border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <span className="font-black text-sm uppercase tracking-tight">
                              {s.name}
                            </span>
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors border ${
                                isSelected
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-gray-300 dark:border-gray-700'
                              }`}
                            >
                              {isSelected && <Check className="w-4 h-4" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-gray-500">
                      No subjects found for this exam.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Parameter Settings */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <Sliders className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      Study Parameters
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                      Fine-tune your cognitive target
                    </p>
                  </div>
                </div>

                {/* Difficulty Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Practice Difficulty
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'EASY', label: 'Easy' },
                      { id: 'MEDIUM', label: 'Medium' },
                      { id: 'HARD', label: 'Hard' },
                      { id: 'MIXED', label: 'Mixed' },
                      { id: 'ADAPTIVE', label: 'Adaptive' },
                    ].map(diff => (
                      <button
                        key={diff.id}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={() => setSelectedDifficulty(diff.id as any)}
                        className={`p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-tight ${
                          selectedDifficulty === diff.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            : 'border-gray-100 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {diff.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {selectedDifficulty === 'ADAPTIVE'
                      ? 'AI dynamically adjusts question difficulty based on your performance trends.'
                      : 'Practice questions will be tailored to the chosen difficulty level.'}
                  </p>
                </div>

                {/* Daily Goal */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Daily Practice Goal
                    </label>
                    <span className="text-sm font-black text-primary-500 uppercase">
                      {dailyGoal} Mins / Day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={dailyGoal}
                    onChange={e => setDailyGoal(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>5m</span>
                    <span>15m</span>
                    <span>30m</span>
                    <span>45m</span>
                    <span>60m</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/40">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                className="px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] border-2"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                disabled={loading}
              >
                Back
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Ready to Calibrate
                </span>
              </div>
            )}

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                className="px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary-500/20 group"
                rightIcon={
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                }
                disabled={loading || (currentStep === 1 && !selectedExam)}
              >
                {currentStep === 0 ? 'Start Customization' : 'Advance'}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary-500/20"
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
                disabled={loading || selectedSubjects.length === 0}
              >
                {loading ? 'Synchronizing...' : 'Initialize Hub'}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

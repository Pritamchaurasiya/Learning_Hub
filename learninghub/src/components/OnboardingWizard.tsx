import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Target,
  BookOpen,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Check,
  Flame,
} from 'lucide-react'
import { useStore } from '../stores/useStore'
import { useLearningContextStore } from '../stores/useLearningContextStore'
import { Button } from './ui/Button'
import { fetchApi } from '../utils/api'

interface ExamItem {
  id: string
  name: string
  slug: string
  description?: string | null
  category: string
  countryCode: string
  badgeText: string
  subjects?: Array<{ id: string; name: string; slug: string }>
}

interface SubjectItem {
  id: string
  name: string
  slug: string
  topics?: Array<{ id: string; name: string; slug: string }>
}

// Curated high-impact exam presets ensuring zero-empty-state reliability
const CURATED_EXAMS: ExamItem[] = [
  {
    id: 'exam-jee-main',
    name: 'JEE Main',
    slug: 'jee-main',
    description: 'National Testing Agency (NTA) CBT for Engineering Admissions (NITs, IIITs, Top CFTIs)',
    category: 'engineering',
    countryCode: 'IN',
    badgeText: 'NTA CBT 2026',
    subjects: [
      { id: 'sub-jee-phy', name: 'Physics', slug: 'jee-main-physics' },
      { id: 'sub-jee-chem', name: 'Chemistry', slug: 'jee-main-chemistry' },
      { id: 'sub-jee-math', name: 'Mathematics', slug: 'jee-main-mathematics' },
    ],
  },
  {
    id: 'exam-jee-adv',
    name: 'JEE Advanced',
    slug: 'jee-advanced',
    description: 'Premier Entrance Exam for admissions into all 23 Indian Institutes of Technology (IITs)',
    category: 'engineering',
    countryCode: 'IN',
    badgeText: 'IIT JEE',
    subjects: [
      { id: 'sub-adv-phy', name: 'Advanced Physics', slug: 'jee-adv-physics' },
      { id: 'sub-adv-chem', name: 'Advanced Chemistry', slug: 'jee-adv-chemistry' },
      { id: 'sub-adv-math', name: 'Advanced Mathematics', slug: 'jee-adv-mathematics' },
    ],
  },
  {
    id: 'exam-neet-ug',
    name: 'NEET-UG',
    slug: 'neet-ug',
    description: 'National Eligibility cum Entrance Test for MBBS, BDS, and Premier Medical Admissions',
    category: 'medical',
    countryCode: 'IN',
    badgeText: 'NTA Medical 720M',
    subjects: [
      { id: 'sub-neet-bio', name: 'Biology (Botany & Zoology)', slug: 'neet-biology' },
      { id: 'sub-neet-phy', name: 'Physics for NEET', slug: 'neet-physics' },
      { id: 'sub-neet-chem', name: 'Chemistry for NEET', slug: 'neet-chemistry' },
    ],
  },
  {
    id: 'exam-bitsat',
    name: 'BITSAT',
    slug: 'bitsat',
    description: 'Birla Institute of Technology and Science Admission Test for Pilani, Goa & Hyderabad',
    category: 'engineering',
    countryCode: 'IN',
    badgeText: 'BITS Pilani',
    subjects: [
      { id: 'sub-bits-phy', name: 'Physics', slug: 'bitsat-physics' },
      { id: 'sub-bits-chem', name: 'Chemistry', slug: 'bitsat-chemistry' },
      { id: 'sub-bits-math', name: 'Mathematics', slug: 'bitsat-mathematics' },
      { id: 'sub-bits-eng', name: 'English & Logical Reasoning', slug: 'bitsat-english-lr' },
    ],
  },
  {
    id: 'exam-dsa-swe',
    name: 'Software Engineering & DSA',
    slug: 'dsa-software-engineering',
    description: 'High-Impact Data Structures, Algorithms, System Design, and FAANG/MAANG Technical Interviews',
    category: 'tech',
    countryCode: 'GLOBAL',
    badgeText: 'FAANG / SDE Ready',
    subjects: [
      { id: 'sub-dsa-core', name: 'Data Structures & Algorithms', slug: 'dsa-core' },
      { id: 'sub-sys-design', name: 'System Design & Architecture', slug: 'system-design' },
      { id: 'sub-cs-fund', name: 'Core CS (OS, DBMS, Networks)', slug: 'core-cs-fundamentals' },
    ],
  },
  {
    id: 'exam-gate-cse',
    name: 'GATE Computer Science',
    slug: 'gate-cse',
    description: 'Graduate Aptitude Test in Engineering for IIT M.Tech admissions & PSU Recruitments',
    category: 'higher',
    countryCode: 'IN',
    badgeText: 'IIT M.Tech / PSU',
    subjects: [
      { id: 'sub-gate-cs', name: 'Computer Science & Engineering', slug: 'gate-cs-it' },
    ],
  },
  {
    id: 'exam-cbse-12',
    name: 'CBSE Class 12 Boards',
    slug: 'cbse-class-12',
    description: 'Class 12th Board Examinations for Science Stream with NCERT Proofs & Numerical Solutions',
    category: 'boards',
    countryCode: 'IN',
    badgeText: 'Class 12 Board',
    subjects: [
      { id: 'sub-cbse-phy', name: 'Physics Class 12', slug: 'cbse-12-physics' },
      { id: 'sub-cbse-chem', name: 'Chemistry Class 12', slug: 'cbse-12-chemistry' },
      { id: 'sub-cbse-math', name: 'Mathematics Class 12', slug: 'cbse-12-mathematics' },
    ],
  },
]

export default function OnboardingWizard() {
  const location = useLocation()
  const auth = useStore(state => state.auth)
  const fetchMe = useStore(state => state.fetchMe)
  const addToast = useStore(state => state.addToast)
  const hasSeenOnboarding = useStore(state => state.hasSeenOnboarding)
  const setHasSeenOnboarding = useStore(state => state.setHasSeenOnboarding)

  const switchExamContext = useLearningContextStore(state => state.switchExam)
  const setLearningContext = useLearningContextStore(state => state.setContext)

  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Data State
  const [exams, setExams] = useState<ExamItem[]>(CURATED_EXAMS)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [loading, setLoading] = useState(false)

  // Selection State
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedExam, setSelectedExam] = useState<string>('exam-jee-main')
  const [selectedExamObj, setSelectedExamObj] = useState<ExamItem>(CURATED_EXAMS[0])
  const [targetYear, setTargetYear] = useState<string>('2026')
  const [studentStage, setStudentStage] = useState<string>('Class 12')
  const [studyMedium, setStudyMedium] = useState<string>('Hinglish')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    'EASY' | 'MEDIUM' | 'HARD' | 'MIXED' | 'ADAPTIVE'
  >('MEDIUM')
  const [dailyGoal, setDailyGoal] = useState<number>(30)

  useEffect(() => {
    setIsHydrated(useStore.persist.hasHydrated())
    const unsubHydrate = useStore.persist.onFinishHydration(() => setIsHydrated(true))
    return () => unsubHydrate()
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    // Automated test environments bypass
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
        void loadBackendExams()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [auth.isAuthenticated, auth.user?.examPreference, hasSeenOnboarding, location.pathname, isHydrated])

  const loadBackendExams = async () => {
    try {
      setLoading(true)
      const res = await fetchApi('/exam-content/exams')
      const apiExams = res?.data ?? res
      if (Array.isArray(apiExams) && apiExams.length > 0) {
        // Merge API exams with curated metadata
        const formatted: ExamItem[] = apiExams.map((e: any) => {
          let category = 'engineering'
          const s = (e.slug || e.name || '').toLowerCase()
          if (s.includes('neet') || s.includes('med')) category = 'medical'
          else if (s.includes('dsa') || s.includes('software') || s.includes('swe')) category = 'tech'
          else if (s.includes('gate')) category = 'higher'
          else if (s.includes('cbse') || s.includes('board') || s.includes('school')) category = 'boards'

          return {
            id: e.id,
            name: e.name,
            slug: e.slug,
            description: e.description,
            category,
            countryCode: e.country?.code || 'IN',
            badgeText: category === 'engineering' ? 'NTA Engineering' : category === 'medical' ? 'NTA Medical' : 'Tech SDE',
            subjects: e.subjects,
          }
        })
        setExams(formatted)
        if (formatted.length > 0) {
          setSelectedExam(formatted[0].id)
          setSelectedExamObj(formatted[0])
          loadSubjectsForExam(formatted[0])
        }
      } else {
        // Fallback to rich curated exams
        loadSubjectsForExam(CURATED_EXAMS[0])
      }
    } catch (err) {
      console.warn('Failed to load exams from API, using curated presets:', err)
      loadSubjectsForExam(CURATED_EXAMS[0])
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectsForExam = async (exam: ExamItem) => {
    if (exam.subjects && exam.subjects.length > 0) {
      setSubjects(exam.subjects)
      setSelectedSubjects(exam.subjects.map(s => s.id))
      return
    }

    try {
      setLoading(true)
      const res = await fetchApi(`/exam-content/exams/${exam.id}/subjects`)
      const subs = res?.data ?? res
      if (Array.isArray(subs) && subs.length > 0) {
        setSubjects(subs)
        setSelectedSubjects(subs.map((s: any) => s.id))
      } else {
        // Default subjects
        const fallback = [
          { id: 'sub-1', name: 'Physics', slug: 'physics' },
          { id: 'sub-2', name: 'Chemistry', slug: 'chemistry' },
          { id: 'sub-3', name: 'Mathematics', slug: 'mathematics' },
        ]
        setSubjects(fallback)
        setSelectedSubjects(fallback.map(s => s.id))
      }
    } catch {
      const fallback = [
        { id: 'sub-1', name: 'Physics', slug: 'physics' },
        { id: 'sub-2', name: 'Chemistry', slug: 'chemistry' },
        { id: 'sub-3', name: 'Mathematics', slug: 'mathematics' },
      ]
      setSubjects(fallback)
      setSelectedSubjects(fallback.map(s => s.id))
    } finally {
      setLoading(false)
    }
  }

  const handleSelectExam = (exam: ExamItem) => {
    setSelectedExam(exam.id)
    setSelectedExamObj(exam)
    loadSubjectsForExam(exam)
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const handleSelectAllSubjects = () => {
    setSelectedSubjects(subjects.map(s => s.id))
  }

  const filteredExams = useMemo(() => {
    if (selectedCategory === 'all') return exams
    return exams.filter(e => e.category === selectedCategory)
  }, [exams, selectedCategory])

  const handleNext = () => {
    if (currentStep === 1 && !selectedExam) {
      addToast({ message: 'Please select your target exam to continue.', type: 'warning' })
      return
    }
    if (currentStep === 3 && selectedSubjects.length === 0) {
      addToast({ message: 'Please select at least one subject to study.', type: 'warning' })
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

      // 1. Sync to backend user preferences
      await fetchApi('/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          examId: selectedExamObj.id,
          subjectIds: selectedSubjects,
          difficulty: selectedDifficulty,
          dailyGoal,
        }),
      })

      // 2. Sync to Zustand learning context store
      switchExamContext(
        {
          id: selectedExamObj.id,
          name: `${selectedExamObj.name} ${targetYear}`,
          slug: selectedExamObj.slug,
          countryId: selectedExamObj.countryCode === 'GLOBAL' ? 'country-global' : 'country-in',
          country: {
            id: selectedExamObj.countryCode === 'GLOBAL' ? 'country-global' : 'country-in',
            name: selectedExamObj.countryCode === 'GLOBAL' ? 'Global / Tech' : 'India',
            code: selectedExamObj.countryCode,
            flagEmoji: selectedExamObj.countryCode === 'GLOBAL' ? '🌐' : '🇮🇳',
          },
          subjects: subjects.filter(s => selectedSubjects.includes(s.id)),
        },
        subjects.filter(s => selectedSubjects.includes(s.id))
      )

      await setLearningContext({
        difficulty: selectedDifficulty,
        dailyGoal,
      })

      addToast({
        message: `🎉 Goal Locked: ${selectedExamObj.name} ${targetYear}! Your personalized feed is ready.`,
        type: 'success',
      })

      setHasSeenOnboarding(true)
      setIsOpen(false)
      await fetchMe()
    } catch (err) {
      console.error('Failed to save preferences', err)
      // Even if network fails, persist in local store so user is not blocked
      switchExamContext(
        {
          id: selectedExamObj.id,
          name: `${selectedExamObj.name} ${targetYear}`,
          slug: selectedExamObj.slug,
          countryId: 'country-in',
          subjects: subjects.filter(s => selectedSubjects.includes(s.id)),
        },
        subjects.filter(s => selectedSubjects.includes(s.id))
      )
      setHasSeenOnboarding(true)
      setIsOpen(false)
      addToast({ message: 'Target calibrated in local workspace!', type: 'success' })
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ scale: 0.92, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 20, opacity: 0 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
        >
          {/* Header Progress Stepper */}
          <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === currentStep
                      ? 'w-8 bg-primary-500'
                      : i < currentStep
                        ? 'w-3 bg-emerald-500'
                        : 'w-2 bg-gray-200 dark:bg-slate-800'
                  }`}
                />
              ))}
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 pl-2">
                Step {currentStep} of 4
              </span>
            </div>

            <button
              onClick={handleSkip}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-500 transition-colors flex items-center gap-1"
            >
              Skip for now <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Modal Body with smooth scrolling */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1">
            {/* STEP 0: Welcome / High-Impact Introduction */}
            {currentStep === 0 && (
              <div className="space-y-6 text-center py-6">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center mx-auto shadow-xl shadow-primary-500/25">
                  <Target className="w-10 h-10 text-white animate-pulse" />
                </div>
                <div className="space-y-3">
                  <span className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 text-xs font-black uppercase tracking-widest border border-primary-200 dark:border-primary-800">
                    Personalized Learning Trajectory
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                    Select Your Target Exam & Goal
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
                    Tell us what exam you are preparing for. We calibrate high-yield PYQs, NTA CBT mock tests, formula cheat sheets, and daily AI diagnostics specifically for your syllabus.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-xl mx-auto text-left">
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                    <span className="text-xl">🎯</span>
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-1">Verified PYQs</h4>
                    <p className="text-[11px] text-gray-500">Official past papers with faculty proof steps</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                    <span className="text-xl">⚡</span>
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-1">CBT Mock Tests</h4>
                    <p className="text-[11px] text-gray-500">Real exam interface with percentile analytics</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                    <span className="text-xl">📖</span>
                    <h4 className="font-bold text-xs text-gray-900 dark:text-white mt-1">Formula Vault</h4>
                    <p className="text-[11px] text-gray-500">One-page high-weightage cheat sheets & maps</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1: Choose Target Exam & Category */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Target className="w-6 h-6 text-primary-500" />
                    <span>Choose Your Target Examination</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select your primary competitive exam to personalize courses, tests, and recommendations.
                  </p>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Exams' },
                    { id: 'engineering', label: '⚡ Engineering (JEE / BITSAT)' },
                    { id: 'medical', label: '🩺 Medical (NEET-UG)' },
                    { id: 'tech', label: '💻 Software / Coding & DSA' },
                    { id: 'boards', label: '📚 Class 12 Boards' },
                    { id: 'higher', label: '🏛️ GATE / Higher' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Exam Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[46vh] overflow-y-auto pr-1">
                  {filteredExams.map(exam => {
                    const isSelected = selectedExam === exam.id
                    return (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => handleSelectExam(exam)}
                        className={`p-5 rounded-2xl border-2 transition-all text-left flex flex-col justify-between group relative ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/30 text-primary-950 dark:text-white shadow-lg shadow-primary-500/10 ring-2 ring-primary-500/20'
                            : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-gray-300 dark:hover:border-slate-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {exam.badgeText}
                            </span>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                                isSelected
                                  ? 'bg-primary-500 border-primary-500 text-white'
                                  : 'border-gray-300 dark:border-slate-700'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>

                          <h4 className="text-base font-black tracking-tight leading-snug">
                            {exam.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {exam.description || 'Practice tests, verified PYQs, and topic mastery engine.'}
                          </p>
                        </div>

                        {exam.subjects && exam.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-3 mt-3 border-t border-gray-100 dark:border-slate-800/60">
                            {exam.subjects.map(sub => (
                              <span
                                key={sub.id}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
                              >
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Target Year & Student Calibration Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Sliders className="w-6 h-6 text-amber-500" />
                    <span>Calibrate Your Target & Batch</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Personalizing roadmap for <strong className="text-primary-500">{selectedExamObj.name}</strong>.
                  </p>
                </div>

                {/* Target Year */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Target Exam Year
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { year: '2025', label: '2025 (Final Lap / Repeater)' },
                      { year: '2026', label: '2026 (Prime Batch - Current)' },
                      { year: '2027', label: '2027 (Foundation / 11th)' },
                    ].map(y => (
                      <button
                        key={y.year}
                        type="button"
                        onClick={() => setTargetYear(y.year)}
                        className={`p-3.5 rounded-2xl border-2 transition-all font-bold text-left ${
                          targetYear === y.year
                            ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 shadow-sm'
                            : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg font-black">{y.year}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{y.label.split('(')[1]?.replace(')', '')}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prep Level / Stage */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Current Preparation Stage
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {['Class 11', 'Class 12', 'Dropper / Repeater', 'College / SDE Aspirant'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStudentStage(st)}
                        className={`p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-tight ${
                          studentStage === st
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                            : 'border-gray-100 dark:border-slate-800 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Study Medium */}
                <div className="space-y-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Preferred Medium / Language
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'Hinglish', title: 'Hinglish', subtitle: 'Hindi + English (Recommended)' },
                      { id: 'English', title: 'English', subtitle: 'Pure English Content' },
                      { id: 'Hindi', title: 'Hindi', subtitle: 'हिंदी माध्यम' },
                    ].map(med => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => setStudyMedium(med.id)}
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                          studyMedium === med.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                            : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{med.title}</div>
                        <div className="text-[10px] text-gray-400">{med.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Core Subjects & Focus Topics */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-emerald-500" />
                      <span>Focus Subjects & Syllabus</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Choose which subjects to include in your daily diagnostic and practice plan.
                    </p>
                  </div>

                  <button
                    onClick={handleSelectAllSubjects}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-500 underline"
                  >
                    Select All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {subjects.map(s => {
                    const isSelected = selectedSubjects.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSubject(s.id)}
                        className={`p-5 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 shadow-sm'
                            : 'border-gray-100 dark:border-slate-800 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <span className="font-black text-sm uppercase tracking-tight block">
                            {s.name}
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5 block">
                            High-Yield Topic Coverage
                          </span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors border ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Daily Goal & Difficulty */}
                <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Practice Difficulty Target
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'EASY', label: 'Easy' },
                        { id: 'MEDIUM', label: 'Medium' },
                        { id: 'HARD', label: 'Hard' },
                        { id: 'MIXED', label: 'Mixed' },
                        { id: 'ADAPTIVE', label: 'Adaptive' },
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDifficulty(d.id as any)}
                          className={`p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                            selectedDifficulty === d.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400'
                              : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200/50 dark:border-slate-700/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                        Daily Practice Goal
                      </span>
                      <span className="text-sm font-black text-primary-500">
                        {dailyGoal} Mins / Day
                      </span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="90"
                      step="15"
                      value={dailyGoal}
                      onChange={e => setDailyGoal(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      <span>15m (Light)</span>
                      <span>30m (Recommended)</span>
                      <span>60m (Intensive)</span>
                      <span>90m (Top Rankers)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Confirmation & Celebration */}
            {currentStep === 4 && (
              <div className="space-y-6 text-center py-6">
                <div className="w-20 h-20 rounded-[2rem] bg-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">
                    Calibration Ready
                  </span>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {selectedExamObj.name} {targetYear} Locked!
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Your personalized study command center is prepared with target PYQs, mock tests, and high-yield formula sheets.
                  </p>
                </div>

                {/* Summary Pill Badge */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Exam:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedExamObj.name} ({targetYear})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Preparation Stage:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{studentStage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Subjects:</span>
                    <span className="font-bold text-emerald-600">{selectedSubjects.length} Subjects Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Study Target:</span>
                    <span className="font-bold text-amber-500">{dailyGoal} Mins / Day</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/60 shrink-0">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border-2"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                disabled={loading}
              >
                Back
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
                  Personalized Roadmap
                </span>
              </div>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary-500/20 group"
                rightIcon={<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
                disabled={loading}
              >
                {currentStep === 0 ? 'Start Customization' : 'Advance'}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="px-10 py-3 rounded-xl font-black uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/25"
                rightIcon={<Sparkles className="w-4 h-4" />}
                disabled={loading}
              >
                {loading ? 'Initializing Hub...' : 'Launch My Dashboard 🚀'}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

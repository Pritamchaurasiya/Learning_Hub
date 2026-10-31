import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Target,
  Globe,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Sparkles,
  Check,
  Languages,
  Sliders,
  MapPin,
  Flame,
} from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { DEFAULT_COUNTRIES, DEFAULT_EXAMS } from '../../data/examCatalogData'
import type { ExamDifficulty, PreparationStage } from '../../types/learningContext'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

interface StudentPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
}

const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  'country-in': [
    'All India / Central',
    'Delhi NCR',
    'Maharashtra',
    'Uttar Pradesh',
    'Karnataka',
    'Tamil Nadu',
    'Telangana',
    'West Bengal',
    'Rajasthan',
    'Bihar',
    'Gujarat',
    'Madhya Pradesh',
    'Kerala',
    'Punjab & Haryana',
  ],
  'country-us': [
    'National / All States',
    'California',
    'New York',
    'Texas',
    'Washington',
    'Massachusetts',
    'Illinois',
    'Florida',
  ],
  'country-gb': ['United Kingdom (National)', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  'country-ca': ['Canada (National)', 'Ontario', 'British Columbia', 'Quebec', 'Alberta'],
  'country-global': ['Global / International Standard'],
}

const LANGUAGES = [
  { code: 'en', name: 'English (Primary)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
]

const PREP_STAGES: Array<{ id: PreparationStage; label: string; desc: string }> = [
  {
    id: 'FOUNDATION',
    label: '1. Foundation Stage',
    desc: 'Focusing on core concepts, lecture videos, and basic formula mastery.',
  },
  {
    id: 'INTERMEDIATE',
    label: '2. Subject Mastery',
    desc: 'Practicing chapter-wise problem banks and solving moderate questions.',
  },
  {
    id: 'INTENSIVE_REVISION',
    label: '3. Intensive Revision & PYQs',
    desc: 'Reviewing official previous-year papers and formula bibles.',
  },
  {
    id: 'MOCK_DRILL',
    label: '4. Final Mock Drill',
    desc: 'Full 3-hour CBT mock series with percentile benchmarking.',
  },
]

export const StudentPreferencesModal: React.FC<StudentPreferencesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addToast } = useToast()

  const currentCountryId = useLearningContextStore(s => s.countryId)
  const currentRegion = useLearningContextStore(s => s.stateRegion)
  const currentExamId = useLearningContextStore(s => s.examId)
  const currentAuthority = useLearningContextStore(s => s.examAuthority)
  const currentTargetDate = useLearningContextStore(s => s.targetExamDate)
  const currentStage = useLearningContextStore(s => s.preparationStage)
  const currentLanguage = useLearningContextStore(s => s.preferredLanguage)
  const currentStudyHours = useLearningContextStore(s => s.studyHoursPerDay)
  const currentDifficulty = useLearningContextStore(s => s.difficulty)
  const currentDailyGoal = useLearningContextStore(s => s.dailyGoal)

  const setStudentPreferences = useLearningContextStore(s => s.setStudentPreferences)
  const switchExam = useLearningContextStore(s => s.switchExam)

  // Local Form State
  const [selectedCountryId, setSelectedCountryId] = useState<string>(
    currentCountryId || 'country-in'
  )
  const [selectedRegion, setSelectedRegion] = useState<string>(
    currentRegion || 'All India / Central'
  )
  const [selectedExamId, setSelectedExamId] = useState<string>(currentExamId || 'exam-jee-main')
  const [examAuthority, setExamAuthority] = useState<string>(
    currentAuthority || 'National Testing Agency (NTA)'
  )
  const [targetExamDate, setTargetExamDate] = useState<string>(currentTargetDate || '')
  const [prepStage, setPrepStage] = useState<PreparationStage>(currentStage || 'INTERMEDIATE')
  const [preferredLang, setPreferredLang] = useState<string>(currentLanguage || 'en')
  const [studyHours, setStudyHours] = useState<number>(currentStudyHours || 2)
  const [difficulty, setDifficulty] = useState<ExamDifficulty>(currentDifficulty || 'MEDIUM')
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(currentDailyGoal || 15)

  const [activeTab, setActiveTab] = useState<'exam' | 'prep' | 'schedule'>('exam')
  const [isSaving, setIsSaving] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  // Sync when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedCountryId(currentCountryId || 'country-in')
      setSelectedRegion(currentRegion || 'All India / Central')
      setSelectedExamId(currentExamId || 'exam-jee-main')
      setExamAuthority(currentAuthority || 'National Testing Agency (NTA)')
      setTargetExamDate(currentTargetDate || '')
      setPrepStage(currentStage || 'INTERMEDIATE')
      setPreferredLang(currentLanguage || 'en')
      setStudyHours(currentStudyHours || 2)
      setDifficulty(currentDifficulty || 'MEDIUM')
      setDailyGoalMinutes(currentDailyGoal || 15)
    }
  }, [
    isOpen,
    currentCountryId,
    currentRegion,
    currentExamId,
    currentAuthority,
    currentTargetDate,
    currentStage,
    currentLanguage,
    currentStudyHours,
    currentDifficulty,
    currentDailyGoal,
  ])

  // Available Exams matching selected country
  const availableExams = React.useMemo(() => {
    return DEFAULT_EXAMS.filter(
      exam =>
        exam.countryId === selectedCountryId ||
        selectedCountryId === 'all' ||
        exam.countryId === 'country-global'
    )
  }, [selectedCountryId])

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Auto-fill exam authority when exam changes
  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId)
    const match = DEFAULT_EXAMS.find(e => e.id === examId)
    if (match) {
      if (match.slug.includes('jee')) setExamAuthority('National Testing Agency (NTA)')
      else if (match.slug.includes('neet')) setExamAuthority('National Testing Agency (NTA)')
      else if (match.slug.includes('ssc')) setExamAuthority('Staff Selection Commission (SSC)')
      else if (match.slug.includes('upsc'))
        setExamAuthority('Union Public Service Commission (UPSC)')
      else if (match.slug.includes('gate')) setExamAuthority('IITs & IISc GATE Committee')
      else if (match.slug.includes('cat')) setExamAuthority('Indian Institutes of Management (IIM)')
      else if (match.slug.includes('sat')) setExamAuthority('The College Board (USA)')
      else if (match.slug.includes('gre')) setExamAuthority('Educational Testing Service (ETS)')
      else if (match.slug.includes('ielts')) setExamAuthority('British Council / IDP')
      else setExamAuthority(`${match.name} Governing Body`)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const chosenExam = DEFAULT_EXAMS.find(e => e.id === selectedExamId)
      if (chosenExam && chosenExam.id !== currentExamId) {
        await switchExam(chosenExam)
      }

      await setStudentPreferences({
        countryId: selectedCountryId,
        stateRegion: selectedRegion,
        examId: selectedExamId,
        examAuthority,
        targetExamDate: targetExamDate || null,
        preparationStage: prepStage,
        preferredLanguage: preferredLang,
        studyHoursPerDay: studyHours,
        difficulty,
        dailyGoal: dailyGoalMinutes,
      })

      addToast('🎯 Learning preferences calibrated successfully!', 'success')
      onClose()
    } catch {
      addToast('Failed to update preferences. Changes saved locally.', 'info')
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const availableRegions = REGIONS_BY_COUNTRY[selectedCountryId] || ['National / All Regions']

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-pref-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl rounded-3xl border border-indigo-500/30 bg-slate-900 text-white shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-5 sm:p-6 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sliders className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="student-pref-title" className="text-lg sm:text-xl font-black text-white">
                  Student Learning Profile & Goal Calibration
                </h2>
                <p className="text-xs text-slate-400">
                  Tailor your dashboard roadmap, exam authority, and study availability.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close preferences modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 bg-slate-950/20 overflow-x-auto scrollbar-none">
            {[
              { id: 'exam', label: '1. Exam & Region', icon: Target },
              { id: 'prep', label: '2. Preparation Stage', icon: Award },
              { id: 'schedule', label: '3. Schedule & Language', icon: Calendar },
            ].map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {activeTab === 'exam' && (
              <div className="space-y-4">
                {/* Country Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    Target Country
                  </label>
                  <select
                    value={selectedCountryId}
                    onChange={e => {
                      setSelectedCountryId(e.target.value)
                      const reg = REGIONS_BY_COUNTRY[e.target.value]
                      if (reg && reg.length > 0) setSelectedRegion(reg[0])
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {DEFAULT_COUNTRIES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.flagEmoji || '🌐'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State / Region Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    State / Region
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={e => setSelectedRegion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {availableRegions.map(reg => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Exam Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-400" />
                    Target Exam
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={e => handleExamChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {availableExams.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} — {ex.category || 'Standard'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exam Authority */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    Exam Authority / Body
                  </label>
                  <input
                    type="text"
                    value={examAuthority}
                    onChange={e => setExamAuthority(e.target.value)}
                    placeholder="e.g. National Testing Agency (NTA)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'prep' && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Select Your Current Preparation Stage
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PREP_STAGES.map(stage => {
                    const isSelected = prepStage === stage.id
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setPrepStage(stage.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/10'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-white">{stage.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{stage.desc}</p>
                      </button>
                    )
                  })}
                </div>

                {/* Practice Difficulty */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Default Question Difficulty
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['EASY', 'MEDIUM', 'HARD', 'ADAPTIVE'] as ExamDifficulty[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all ${
                          difficulty === d
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {/* Target Exam Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Target Exam Date
                  </label>
                  <input
                    type="date"
                    value={targetExamDate}
                    onChange={e => setTargetExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Used to calculate your real daily countdown on the dashboard header.
                  </p>
                </div>

                {/* Study Hours Available Per Day */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Study Availability ({studyHours} Hours / Day)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={studyHours}
                    onChange={e => setStudyHours(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1 hr (Light)</span>
                    <span>3 hrs (Standard)</span>
                    <span>6+ hrs (Intensive)</span>
                  </div>
                </div>

                {/* Daily Goal in Minutes */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Daily Practice Target: {dailyGoalMinutes} Questions / Day
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={dailyGoalMinutes}
                    onChange={e => setDailyGoalMinutes(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Preferred Language */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-cyan-400" />
                    Preferred Study Language
                  </label>
                  <select
                    value={preferredLang}
                    onChange={e => setPreferredLang(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-800 p-5 bg-slate-950/80">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold border-slate-700 text-slate-300 hover:text-white"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSaving ? 'Calibrating...' : 'Apply & Save Target'}</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

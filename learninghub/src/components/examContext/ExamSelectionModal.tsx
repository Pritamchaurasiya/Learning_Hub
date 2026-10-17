import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Target, Search, Check, BookOpen, Sliders, Sparkles } from 'lucide-react'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import { examContentService } from '../../services/examContentService'
import type {
  ActiveCountryInfo,
  ActiveExamInfo,
  ActiveSubjectInfo,
  ExamDifficulty,
} from '../../types/learningContext'

interface ExamSelectionModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ExamSelectionModal: React.FC<ExamSelectionModalProps> = ({ isOpen, onClose }) => {
  const currentExam = useLearningContextStore(s => s.activeExam)
  const currentSubjectIds = useLearningContextStore(s => s.subjectIds)
  const currentDifficulty = useLearningContextStore(s => s.difficulty)
  const currentDailyGoal = useLearningContextStore(s => s.dailyGoal)
  const setContext = useLearningContextStore(s => s.setContext)

  const [countries, setCountries] = useState<ActiveCountryInfo[]>([])
  const [exams, setExams] = useState<ActiveExamInfo[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExam, setSelectedExam] = useState<ActiveExamInfo | null>(currentExam)
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(currentSubjectIds)
  const [difficulty, setDifficulty] = useState<ExamDifficulty>(currentDifficulty)
  const [dailyGoal, setDailyGoal] = useState<number>(currentDailyGoal)
  const [isLoading, setIsLoading] = useState(false)

  // Load countries and exams on open
  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [cList, eList] = await Promise.all([
          examContentService.getCountries(),
          examContentService.getExams(),
        ])
        setCountries(cList as ActiveCountryInfo[])
        setExams(eList as ActiveExamInfo[])

        if (currentExam) {
          setSelectedExam(currentExam)
          setSelectedSubjectIds(currentSubjectIds)
          if (currentExam.countryId) {
            setSelectedCountryId(currentExam.countryId)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    void loadData()
  }, [isOpen, currentExam, currentSubjectIds])

  if (!isOpen) return null

  // Filter exams by country & search
  const filteredExams = exams.filter(exam => {
    const matchesCountry = selectedCountryId === 'all' || exam.countryId === selectedCountryId
    const matchesSearch =
      !searchQuery.trim() ||
      exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.description && exam.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCountry && matchesSearch
  })

  const handleExamClick = (exam: ActiveExamInfo) => {
    setSelectedExam(exam)
    const defaultIds = exam.subjects ? exam.subjects.map(s => s.id) : []
    setSelectedSubjectIds(defaultIds)
  }

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    )
  }

  const handleSave = async () => {
    if (!selectedExam) return

    const activeSubjects = (selectedExam.subjects || []).filter((s: ActiveSubjectInfo) =>
      selectedSubjectIds.includes(s.id)
    )

    await setContext({
      countryId: selectedExam.countryId,
      examId: selectedExam.id,
      activeExam: selectedExam,
      activeCountry:
        countries.find(c => c.id === selectedExam.countryId) || selectedExam.country || null,
      subjectIds: selectedSubjectIds,
      activeSubjects,
      difficulty,
      dailyGoal,
      isConfigured: true,
    })

    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Target Exam &amp; Learning Context</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Personalized
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Scope your course recommendations, Tests A+ mock drills, and syllabus tracking.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Country Tabs */}
          <div className="p-5 border-b border-slate-800 space-y-3 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search target exam (e.g. GATE CS, JEE, SAT, FAANG)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Country Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCountryId('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCountryId === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Regions
              </button>
              {countries.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCountryId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    selectedCountryId === c.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{c.flagEmoji || '🌐'}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Body: Exam Grid + Subject Customizer */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select Exam Objective:</span>
              </h3>

              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading exam catalogue...
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-2xl">
                  No exams match your search criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredExams.map(exam => {
                    const isSelected = selectedExam?.id === exam.id
                    return (
                      <div
                        key={exam.id}
                        onClick={() => handleExamClick(exam)}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/30'
                            : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/60 text-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-white">{exam.name}</span>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-emerald-500 text-slate-950">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        {exam.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {exam.description}
                          </p>
                        )}
                        {exam.subjects && exam.subjects.length > 0 && (
                          <div className="mt-2 text-[11px] text-slate-500 font-mono">
                            {exam.subjects.length} Subjects included
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Subject Customizer (Shown if an exam is selected) */}
            {selectedExam && selectedExam.subjects && selectedExam.subjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Included Syllabus Subjects for &apos;{selectedExam.name}&apos;:</span>
                  </h4>
                  <span className="text-xs font-mono text-emerald-400">
                    {selectedSubjectIds.length} / {selectedExam.subjects.length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedExam.subjects.map(subject => {
                    const isChecked = selectedSubjectIds.includes(subject.id)
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isChecked
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-indigo-500 text-white' : 'border border-slate-500'
                          }`}
                        >
                          {isChecked && '✓'}
                        </span>
                        <span>{subject.name}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Study Preferences (Difficulty & Goal) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Target Question Difficulty:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['EASY', 'MEDIUM', 'HARD'] as ExamDifficulty[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                        difficulty === d
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Daily Problem Goal:
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {dailyGoal} / day
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={dailyGoal}
                  onChange={e => setDailyGoal(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <span className="text-xs text-slate-400 hidden sm:block">
              {selectedExam ? `Target: ${selectedExam.name}` : 'Select an exam to continue'}
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedExam}
                onClick={handleSave}
                className="py-2.5 px-6 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save &amp; Personalize Hub</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

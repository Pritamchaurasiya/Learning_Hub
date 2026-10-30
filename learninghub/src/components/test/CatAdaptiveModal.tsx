import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Zap,
  Brain,
  Award,
  ShieldCheck,
  RotateCcw,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Activity,
} from 'lucide-react'
import {
  catService,
  CatSessionState,
  CatScorecard,
  ConfidenceLevel,
} from '../../services/catService'
import { useLearningContextStore } from '../../stores/useLearningContextStore'
import type { QuestionTelemetry } from '../../services/remediationService'
import { playRewardChime } from '../../utils/soundEffects'
import { CatPsychometricCharts } from './CatPsychometricCharts'
import { AdaptiveRemediationModal } from './AdaptiveRemediationModal'

interface CatAdaptiveModalProps {
  isOpen: boolean
  onClose: () => void
  initialSubject?: string
  initialExamSlug?: string
}

export const AVAILABLE_DISCIPLINES = [
  { id: 'Physics', label: 'Physics', exam: 'jee-main', badge: 'JEE/NEET' },
  { id: 'Chemistry', label: 'Chemistry', exam: 'jee-main', badge: 'JEE/NEET' },
  { id: 'Mathematics', label: 'Mathematics', exam: 'jee-main', badge: 'JEE/SAT' },
  { id: 'Biology', label: 'Biology', exam: 'neet', badge: 'NEET/MCAT' },
  { id: 'Computer Science', label: 'Computer Science', exam: 'gate', badge: 'GATE CS' },
  { id: 'Quantitative Aptitude', label: 'Quantitative Aptitude', exam: 'gre', badge: 'GRE/GMAT' },
  { id: 'Verbal Reasoning', label: 'Verbal Reasoning', exam: 'gre', badge: 'GRE/GMAT' },
  { id: 'Biomedical Sciences', label: 'Biomedical Sciences', exam: 'usmle', badge: 'USMLE/MCAT' },
]

export const CatAdaptiveModal: React.FC<CatAdaptiveModalProps> = ({
  isOpen,
  onClose,
  initialSubject,
  initialExamSlug,
}) => {
  const { activeExam, activeSubjects } = useLearningContextStore()
  const [selectedExam, setSelectedExam] = useState<string>(
    initialExamSlug || activeExam?.slug || 'jee-main'
  )
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || activeSubjects[0]?.name || 'Physics'
  )

  useEffect(() => {
    if (initialSubject) setSelectedSubject(initialSubject)
    if (initialExamSlug) setSelectedExam(initialExamSlug)
  }, [initialSubject, initialExamSlug])

  const [session, setSession] = useState<CatSessionState | null>(null)
  const [scorecard, setScorecard] = useState<CatScorecard | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [confidence, setConfidence] = useState<ConfidenceLevel>('MEDIUM')
  const [loading, setLoading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [remediationTelemetry, setRemediationTelemetry] = useState<QuestionTelemetry | null>(null)
  const [isRemediationOpen, setIsRemediationOpen] = useState<boolean>(false)

  const primaryRemediationTopic = React.useMemo(() => {
    if (!scorecard?.topicMastery) return null
    const needsFocus = Object.entries(scorecard.topicMastery).find(
      ([_, stats]) => stats.masteryLevel === 'NEEDS_FOCUS'
    )
    if (needsFocus) return needsFocus[0]
    const proficient = Object.entries(scorecard.topicMastery).find(
      ([_, stats]) => stats.masteryLevel === 'PROFICIENT'
    )
    return proficient ? proficient[0] : Object.keys(scorecard.topicMastery)[0] || null
  }, [scorecard])

  const handleLaunchRemediation = (topicName: string) => {
    const telemetry: QuestionTelemetry = {
      questionId: `cat-audit-${Date.now()}`,
      conceptId: topicName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      conceptName: topicName,
      difficulty: scorecard ? Math.max(0.1, Math.min(0.9, (scorecard.finalTheta + 3) / 6)) : 0.5,
      discrimination: 1.5,
      timeSpentSeconds: 45,
      benchmarkTimeSeconds: 60,
      isCorrect: false,
      selectedOptionIndex: 1,
      correctOptionIndex: 0,
      userPriorMastery: scorecard
        ? Math.max(0.15, Math.min(0.85, (scorecard.finalTheta + 3) / 6))
        : 0.4,
    }
    setRemediationTelemetry(telemetry)
    setIsRemediationOpen(true)
  }

  // Start new adaptive testing session
  const startSession = useCallback(
    async (subjOverride?: string, examOverride?: string) => {
      const targetSubj = subjOverride || selectedSubject
      const targetExam = examOverride || selectedExam
      setLoading(true)
      setError(null)
      setScorecard(null)
      setSelectedOption('')
      setConfidence('MEDIUM')
      try {
        const newSession = await catService.startSession(targetSubj, targetExam)
        setSession(newSession)
        setQuestionStartTime(Date.now())
      } catch (err: any) {
        setError(
          err?.message || 'Failed to start adaptive CAT session. Please ensure backend is active.'
        )
      } finally {
        setLoading(false)
      }
    },
    [selectedSubject, selectedExam]
  )

  const handleSelectDiscipline = (newSubj: string, newExam: string) => {
    setSelectedSubject(newSubj)
    setSelectedExam(newExam)
    void startSession(newSubj, newExam)
  }

  useEffect(() => {
    if (isOpen) {
      void startSession()
    } else {
      setSession(null)
      setScorecard(null)
    }
  }, [isOpen])

  // Submit answer and fetch adaptive calibration
  const handleSubmitAnswer = async () => {
    if (!session || !session.activeItem || !selectedOption) return

    setSubmitting(true)
    setError(null)
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000))

    try {
      const res = await catService.submitAnswer({
        sessionId: session.sessionId,
        itemId: session.activeItem.id,
        selectedOptionId: selectedOption,
        confidence,
        timeSpentSeconds: timeSpent,
      })

      if (res.session.isCompleted) {
        // Fetch detailed diagnostic psychometric scorecard
        const card = await catService.getScorecard(res.session.sessionId)
        setScorecard(card)
        setSession(res.session)
        playRewardChime('milestone')
      } else {
        setSession(res.session)
        setSelectedOption('')
        setConfidence('MEDIUM')
        setQuestionStartTime(Date.now())
      }
    } catch (err: any) {
      setError(err?.message || 'Error processing adaptive calibration. Please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  // Ability band color helper
  const getAbilityBadge = (band: string) => {
    switch (band) {
      case 'MASTER':
        return {
          text: 'Master Tier',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        }
      case 'ADVANCED':
        return { text: 'Advanced Tier', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' }
      case 'PROFICIENT':
        return {
          text: 'Proficient Tier',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
        }
      case 'INTERMEDIATE':
        return {
          text: 'Intermediate Tier',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        }
      default:
        return { text: 'Foundational Tier', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
    }
  }

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900/90 border border-slate-700/60 shadow-2xl backdrop-blur-2xl text-slate-100 flex flex-col z-10"
          >
            {/* Header */}
            <div className="sticky top-0 z-20 px-6 py-4 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                      CAT Psychometric Test
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        3PL IRT Engine
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>
                      Subject: <strong className="text-slate-200">{selectedSubject}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Exam: <strong className="text-cyan-400 uppercase">{selectedExam}</strong>
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Discipline Navigation Toolbar */}
            <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Discipline:
              </span>
              {AVAILABLE_DISCIPLINES.map(d => {
                const isSelected = selectedSubject.toLowerCase() === d.id.toLowerCase()
                return (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDiscipline(d.id, d.exam)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20 font-semibold'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{d.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {d.badge}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Body */}
            <div className="p-6 flex-1 space-y-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 font-medium">
                    Calibrating Bayesian Prior & Question Bank...
                  </p>
                </div>
              ) : error ? (
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-rose-200">Session Error</h4>
                    <p className="text-xs text-rose-300/90 mt-1">{error}</p>
                    <button
                      onClick={() => void startSession()}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              ) : scorecard ? (
                /* --- SCORECARD POST-TEST VIEW --- */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  {/* Hero Banner */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 p-6 shadow-xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Award className="w-3.5 h-3.5" /> Diagnostic Assessment Completed
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                          Psychometric Diagnostic Scorecard
                        </h2>
                        <p className="text-xs text-slate-400">
                          Calibrated via 3-Parameter Logistic Bayesian EAP Item Response Theory
                        </p>
                      </div>

                      <div className="text-right sm:text-right">
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                          {scorecard.percentileRank.toFixed(1)}%ile
                        </div>
                        <span
                          className={`inline-block mt-1 px-3 py-0.5 text-xs font-bold rounded-full border ${getAbilityBadge(scorecard.abilityBand).bg}`}
                        >
                          {getAbilityBadge(scorecard.abilityBand).text}
                        </span>
                      </div>
                    </div>

                    {/* Core Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                          Ability Logit (θ)
                        </span>
                        <div className="text-lg font-bold text-white mt-1">
                          {scorecard.finalTheta > 0
                            ? `+${scorecard.finalTheta}`
                            : scorecard.finalTheta}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          95% CI: [{scorecard.confidenceInterval95.join(', ')}]
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                          Normalized Score
                        </span>
                        <div className="text-lg font-bold text-cyan-400 mt-1">
                          {scorecard.normalizedScore} / 100
                        </div>
                        <span className="text-[10px] text-slate-500">Scaled Psychometric</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                          Accuracy Rate
                        </span>
                        <div className="text-lg font-bold text-emerald-400 mt-1">
                          {scorecard.accuracyRate}%
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {scorecard.totalQuestions} Questions Given
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                          Standard Error
                        </span>
                        <div className="text-lg font-bold text-indigo-400 mt-1">
                          ±{scorecard.finalSem}
                        </div>
                        <span className="text-[10px] text-emerald-400">Converged</span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence-Based Marking (CBM) Matrix */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Confidence-Based Marking (CBM) Matrix
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mastery
                        </span>
                        <div className="text-xl font-bold text-white mt-1">
                          {scorecard.cbmBreakdown.masteryCount}
                        </div>
                        <span className="text-[10px] text-emerald-300/70">
                          Correct + High Conf.
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                        <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Intuition
                        </span>
                        <div className="text-xl font-bold text-white mt-1">
                          {scorecard.cbmBreakdown.intuitionCount}
                        </div>
                        <span className="text-[10px] text-cyan-300/70">Correct + Low Conf.</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Hesitation
                        </span>
                        <div className="text-xl font-bold text-white mt-1">
                          {scorecard.cbmBreakdown.hesitationCount}
                        </div>
                        <span className="text-[10px] text-amber-300/70">Incorrect + Low Conf.</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                        <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" /> Blindspots
                        </span>
                        <div className="text-xl font-bold text-white mt-1">
                          {scorecard.cbmBreakdown.blindspotCount}
                        </div>
                        <span className="text-[10px] text-rose-300/70">Incorrect + High Conf.</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Psychometric Visualizations (Bell Curve, Convergence Trajectory, TIC) */}
                  <CatPsychometricCharts scorecard={scorecard} />

                  {/* Topic Mastery Grid */}
                  {scorecard.topicMastery && Object.keys(scorecard.topicMastery).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                        Topic Mastery Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(scorecard.topicMastery).map(([topic, stats]) => (
                          <div
                            key={topic}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-slate-200">{topic}</span>
                              <div className="text-[10px] text-slate-400">
                                {stats.correct} / {stats.total} correct ({stats.accuracy}%)
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border ${
                                  stats.masteryLevel === 'MASTERED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : stats.masteryLevel === 'PROFICIENT'
                                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {stats.masteryLevel}
                              </span>
                              {stats.masteryLevel === 'NEEDS_FOCUS' && (
                                <button
                                  onClick={() => handleLaunchRemediation(topic)}
                                  title={`Start scaffolded remediation drill for ${topic}`}
                                  className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-semibold border border-rose-500/40 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  Drill <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Socratic Remediation Action */}
                  {scorecard.suggestedRemediationAction && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-950/50 to-slate-900/80 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-indigo-950/40">
                      <div className="flex items-start gap-3">
                        <Brain className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                            Personalized Remediation Plan
                            <span className="px-2 py-0.5 text-[9px] rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                              CAR ENGINE
                            </span>
                          </h5>
                          <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                            {scorecard.suggestedRemediationAction}
                          </p>
                        </div>
                      </div>
                      {primaryRemediationTopic && (
                        <button
                          onClick={() => handleLaunchRemediation(primaryRemediationTopic)}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          Launch Socratic Drill
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cryptographic Proof Footer */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-slate-400 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      Audit Proof: {scorecard.cryptographicAuditProof.hash.slice(0, 24)}...
                    </span>
                    <span>
                      {new Date(scorecard.cryptographicAuditProof.signedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => void startSession()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retake Adaptive Test
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all"
                    >
                      Done & View Feed
                    </button>
                  </div>
                </motion.div>
              ) : session && session.activeItem ? (
                /* --- ACTIVE QUESTION VIEW --- */
                <div className="space-y-6">
                  {/* Psychometric Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">
                          Question {session.questionsAnswered + 1} of ~{session.maxQuestions}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {session.stage === 1
                            ? 'Stage 1: Routing'
                            : session.stage === 2
                              ? 'Stage 2: Difficulty Pinning'
                              : 'Stage 3: Fine Mastery'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          Est. Ability:{' '}
                          <strong className="text-cyan-400">
                            {session.currentTheta > 0
                              ? `+${session.currentTheta.toFixed(2)}`
                              : session.currentTheta.toFixed(2)}
                          </strong>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          SEM:{' '}
                          <strong className="text-indigo-400">
                            ±{session.currentSem.toFixed(2)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, ((session.questionsAnswered + 1) / session.maxQuestions) * 100)}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Question Text Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 shadow-inner">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                        {session.activeItem.topic}
                      </span>
                      {session.activeItem.bloomLevel && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                          Bloom: {session.activeItem.bloomLevel}
                        </span>
                      )}
                    </div>

                    <p className="text-base font-medium text-slate-100 leading-relaxed">
                      {session.activeItem.text}
                    </p>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                      Select Your Answer
                    </span>

                    {session.activeItem.options.map((opt, idx) => {
                      const isSelected = selectedOption === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOption(opt.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-950/70 to-slate-900 border-indigo-500/80 shadow-md shadow-indigo-500/10 text-white ring-1 ring-indigo-500/50'
                              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <div className="flex-1 text-sm leading-relaxed">{opt.text}</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Confidence-Based Marking (CBM) Selector */}
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Confidence Level (CBM)
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Calibrates metacognition
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          level: 'LOW' as ConfidenceLevel,
                          label: 'Low',
                          badge: '+1 / 0',
                          desc: 'Modest wager',
                        },
                        {
                          level: 'MEDIUM' as ConfidenceLevel,
                          label: 'Medium',
                          badge: '+2 / -1',
                          desc: 'Standard risk',
                        },
                        {
                          level: 'HIGH' as ConfidenceLevel,
                          label: 'High',
                          badge: '+3 / -2',
                          desc: 'Mastery reward',
                        },
                      ].map(c => {
                        const isActive = confidence === c.level
                        return (
                          <button
                            key={c.level}
                            type="button"
                            onClick={() => setConfidence(c.level)}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              isActive
                                ? 'bg-indigo-500/20 border-indigo-500/80 text-indigo-300 shadow-sm'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-xs font-bold text-white">{c.label}</div>
                            <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                              {c.badge}
                            </div>
                            <div className="text-[9px] text-slate-500">{c.desc}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Press{' '}
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        Submit
                      </kbd>{' '}
                      to proceed
                    </span>

                    <button
                      type="button"
                      disabled={!selectedOption || submitting}
                      onClick={() => void handleSubmitAnswer()}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                        selectedOption && !submitting
                          ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-indigo-700 hover:from-cyan-400 hover:to-indigo-600 text-white shadow-lg shadow-indigo-500/25 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Calibrating Ability...
                        </>
                      ) : (
                        <>
                          Submit & Continue
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Secondary Socratic Remediation Drill Modal */}
      <AdaptiveRemediationModal
        isOpen={isRemediationOpen}
        onClose={() => setIsRemediationOpen(false)}
        telemetry={remediationTelemetry}
        onMasteryUpdated={(conceptId, updatedMastery) => {
          if (scorecard && scorecard.topicMastery) {
            const matchKey = Object.keys(scorecard.topicMastery).find(
              k => k.toLowerCase().replace(/[^a-z0-9]/g, '-') === conceptId
            )
            if (matchKey) {
              setScorecard({
                ...scorecard,
                topicMastery: {
                  ...scorecard.topicMastery,
                  [matchKey]: {
                    ...scorecard.topicMastery[matchKey],
                    masteryLevel:
                      updatedMastery >= 0.8
                        ? 'MASTERED'
                        : updatedMastery >= 0.6
                          ? 'PROFICIENT'
                          : 'NEEDS_FOCUS',
                  },
                },
              })
            }
          }
        }}
      />
    </>
  )
}

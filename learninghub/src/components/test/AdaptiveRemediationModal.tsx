/**
 * AdaptiveRemediationModal.tsx
 * 
 * Milestone 32: AI-Powered Computerized Adaptive Remediation (CAR) Modal
 * Diagnoses mistake etiology, guides learners through targeted scaffolding drills,
 * and updates Bayesian Knowledge Tracing (BKT) concept mastery in real time.
 */

import React, { useState, useEffect } from 'react'
import {
  remediationService,
  QuestionTelemetry,
  DiagnosticAssessment,
  RemediationDrillPayload,
  DrillSubmissionResult
} from '../../services/remediationService'

export interface AdaptiveRemediationModalProps {
  isOpen: boolean
  onClose: () => void
  telemetry: QuestionTelemetry | null
  onMasteryUpdated?: (conceptId: string, updatedMastery: number) => void
}

export const AdaptiveRemediationModal: React.FC<AdaptiveRemediationModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  onMasteryUpdated
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [diagnosis, setDiagnosis] = useState<DiagnosticAssessment | null>(null)
  const [drill, setDrill] = useState<RemediationDrillPayload | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showHint, setShowHint] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [result, setResult] = useState<DrillSubmissionResult | null>(null)

  useEffect(() => {
    if (!isOpen || !telemetry) {
      setDiagnosis(null)
      setDrill(null)
      setResult(null)
      setCurrentStepIndex(0)
      setSelectedAnswers([])
      setShowHint(false)
      return
    }

    let isMounted = true
    setLoading(true)

    const init = async () => {
      try {
        const diag = await remediationService.diagnose(telemetry)
        if (!isMounted) return
        setDiagnosis(diag)

        const drillData = await remediationService.getDrill(diag.conceptId, diag.conceptName, diag.etiology)
        if (!isMounted) return
        setDrill(drillData)
        setSelectedAnswers(new Array(drillData.steps.length).fill(-1))
      } catch (err) {
        console.error('Failed to initialize remediation:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [isOpen, telemetry])

  if (!isOpen || !telemetry) return null

  const handleSelectOption = (optionIndex: number) => {
    if (result) return
    const updated = [...selectedAnswers]
    updated[currentStepIndex] = optionIndex
    setSelectedAnswers(updated)
  }

  const handleNextStep = () => {
    if (!drill) return
    if (currentStepIndex < drill.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
      setShowHint(false)
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
      setShowHint(false)
    }
  }

  const handleSubmitDrill = async () => {
    if (!drill || !diagnosis) return
    setSubmitting(true)

    try {
      const correctAnswers = drill.steps.map(s => s.correctIndex)
      const res = await remediationService.submitDrill(
        diagnosis.conceptId,
        selectedAnswers,
        correctAnswers,
        telemetry.userPriorMastery
      )
      setResult(res)
      if (onMasteryUpdated) {
        onMasteryUpdated(diagnosis.conceptId, res.updatedMastery)
      }
    } catch (err) {
      console.error('Failed submitting drill:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getEtiologyBadgeColor = (etiology: string) => {
    switch (etiology) {
      case 'CARELESS_SLIP':
        return 'bg-amber-900/40 text-amber-300 border-amber-600/50'
      case 'LUCKY_GUESS':
        return 'bg-cyan-900/40 text-cyan-300 border-cyan-600/50'
      case 'CONCEPT_CONFUSION':
        return 'bg-purple-900/40 text-purple-300 border-purple-600/50'
      case 'FATIGUE_FLAG':
        return 'bg-yellow-900/40 text-yellow-300 border-yellow-600/50'
      default:
        return 'bg-rose-900/40 text-rose-300 border-rose-600/50'
    }
  }

  const currentStep = drill?.steps[currentStepIndex]
  const allAnswered = drill ? selectedAnswers.every(ans => ans !== -1) : false

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="adaptive-remediation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-lg">
              🎯
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                AI Adaptive Remediation & Weakness Repair
              </h2>
              <p className="text-xs text-slate-400">
                Concept: <span className="text-slate-200 font-medium">{telemetry.conceptName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Remediation"
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Analyzing cognitive telemetry & synthesizing remediation drill...</p>
            </div>
          ) : diagnosis && drill ? (
            <>
              {/* Cognitive Diagnosis Card */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    data-testid="etiology-badge"
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${getEtiologyBadgeColor(
                      diagnosis.etiology
                    )}`}
                  >
                    Etiology: {diagnosis.etiology.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    Confidence: {(diagnosis.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {diagnosis.explanation}
                </p>
                <div className="text-xs text-slate-400 pt-1 border-t border-slate-700/40 flex items-center justify-between">
                  <span>Prerequisite: {diagnosis.prescribedScaffold.prerequisiteName}</span>
                  <span>Est. Time: {diagnosis.prescribedScaffold.estimatedRecoveryTimeMinutes} min</span>
                </div>
              </div>

              {/* Drill Section or Results */}
              {!result && currentStep ? (
                <div className="space-y-4">
                  {/* Step Progress Indicators */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-semibold text-indigo-400">
                      Tier: {currentStep.tier.replace('_', ' ')}
                    </span>
                    <span>
                      Step {currentStepIndex + 1} of {drill.steps.length}
                    </span>
                  </div>

                  {/* Step Prompt */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <p className="text-sm font-medium text-slate-100 leading-relaxed">
                      {currentStep.prompt}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {currentStep.options.map((option, idx) => {
                      const isSelected = selectedAnswers[currentStepIndex] === idx
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(idx)}
                          className={`w-full text-left p-3 rounded-xl border text-sm transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                              : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border mt-0.5 shrink-0 ${
                              isSelected
                                ? 'bg-indigo-500 border-indigo-400 text-white'
                                : 'border-slate-600 text-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1">{option}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Hint Toggle */}
                  <div className="pt-2">
                    {showHint ? (
                      <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                        💡 <span className="font-semibold">Socratic Hint:</span> {currentStep.hint}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowHint(true)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium underline underline-offset-4"
                      >
                        Need a Socratic Hint?
                      </button>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      onClick={handlePrevStep}
                      disabled={currentStepIndex === 0}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
                    >
                      ← Previous Step
                    </button>

                    {currentStepIndex < drill.steps.length - 1 ? (
                      <button
                        onClick={handleNextStep}
                        disabled={selectedAnswers[currentStepIndex] === -1}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                      >
                        Next Step →
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmitDrill}
                        disabled={!allAnswered || submitting}
                        data-testid="submit-drill-button"
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all shadow-lg shadow-emerald-600/20"
                      >
                        {submitting ? 'Evaluating...' : 'Verify & Update Mastery ✓'}
                      </button>
                    )}
                  </div>
                </div>
              ) : result ? (
                /* Post-Drill Results & BKT Mastery Recovery Card */
                <div data-testid="remediation-result-card" className="space-y-5 py-2">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
                    <div className="text-4xl">
                      {result.passed ? '🎉' : '📖'}
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {result.passed ? 'Remediation Verified!' : 'Concept Requires Deep Review'}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                      {result.feedback}
                    </p>

                    {/* Mastery Delta Bar */}
                    <div className="pt-4 max-w-sm mx-auto space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-400">Bayesian Concept Mastery:</span>
                        <span className={result.masteryDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {(result.previousMastery * 100).toFixed(0)}% → {(result.updatedMastery * 100).toFixed(0)}% (
                          {result.masteryDelta >= 0 ? `+${(result.masteryDelta * 100).toFixed(1)}%` : `${(result.masteryDelta * 100).toFixed(1)}%`})
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            result.passed ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, result.updatedMastery * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={onClose}
                      data-testid="finish-remediation-button"
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Done & Return to Exam
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

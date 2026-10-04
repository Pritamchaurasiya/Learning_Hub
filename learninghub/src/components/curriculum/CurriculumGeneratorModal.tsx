import React, { useState } from 'react'
import {
  Sparkles,
  Calendar,
  Clock,
  Target,
  Award,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import {
  TargetExam,
  EXAM_REGISTRY,
  GenerateCurriculumInput,
} from '../../types/curriculum'

interface CurriculumGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (input: GenerateCurriculumInput) => Promise<void>
  isLoading: boolean
}

export const CurriculumGeneratorModal: React.FC<CurriculumGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isLoading,
}) => {
  const [targetExam, setTargetExam] = useState<TargetExam>('GATE_CS')
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date(Date.now() + 12 * 7 * 86400000)
    return d.toISOString().split('T')[0]
  })
  const [weeklyStudyHours, setWeeklyStudyHours] = useState(15)
  const [diagnosticScore, setDiagnosticScore] = useState(60)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onGenerate({
      targetExam,
      targetDate,
      weeklyStudyHours,
      diagnosticScorePercent: diagnosticScore,
    })
    onClose()
  }

  const selectedExamMeta = EXAM_REGISTRY[targetExam]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Autonomous Curriculum Synthesizer"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Our multi-agent curriculum synthesizer ingests your target exam requirements, available study runway, and weekly time budget to construct a week-by-week mastery roadmap with built-in buffer weeks and KaTeX formulas.
          </p>
        </div>

        {/* 1. Target Exam Selection */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500" />
            Select Your Target Objective / Exam
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.values(EXAM_REGISTRY).map(exam => {
              const isSelected = targetExam === exam.key
              return (
                <button
                  key={exam.key}
                  type="button"
                  onClick={() => {
                    setTargetExam(exam.key)
                    setWeeklyStudyHours(exam.recommendedHours)
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {exam.name}
                    </span>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {exam.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{exam.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Target Exam Date */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            Target Exam / Deadline Date
          </label>
          <input
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* 3. Weekly Hours Commitment */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Weekly Study Commitment
            </label>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              {weeklyStudyHours} hrs / week
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                {weeklyStudyHours >= 22 ? '⚡ Intensive' : weeklyStudyHours >= 12 ? '⚖️ Balanced' : '🌱 Steady'}
              </span>
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={weeklyStudyHours}
            onChange={e => setWeeklyStudyHours(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>5 hrs (Steady)</span>
            <span>15 hrs (Recommended for {selectedExamMeta.name})</span>
            <span>40 hrs (Full-Time)</span>
          </div>
        </div>

        {/* 4. Current Diagnostic Baseline */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Current Diagnostic / Baseline Level
            </label>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              {diagnosticScore}% Baseline
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={diagnosticScore}
            onChange={e => setDiagnosticScore(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold"
          >
            {isLoading ? 'Synthesizing...' : 'Synthesize Custom Syllabus'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

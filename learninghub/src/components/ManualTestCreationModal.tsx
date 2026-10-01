import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  BookOpen,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Layers,
  Sparkles,
  Shuffle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from './ui/Button'
import { MathRenderer } from './MathRenderer'
import { testsAService, TestA } from '../services/testsAService'
import { useStore } from '../stores/useStore'

export interface ManualTestCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onTestCreated: (test: TestA) => void
}

export type TestMode = 'practice' | 'mock' | 'timed_challenge' | 'adaptive' | 'contest'
export type TestDifficulty = 'easy' | 'medium' | 'hard' | 'mixed'
export type QuestionType = 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'NUMERICAL' | 'SUBJECTIVE'

interface DraftOption {
  id: string
  text: string
  isCorrect: boolean
  explanation?: string
}

interface DraftQuestion {
  id: string
  text: string
  type: QuestionType
  points: number
  topic: string
  explanation?: string
  options: DraftOption[]
}

const generateDraftId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

const createDefaultOptions = (): DraftOption[] => [
  { id: generateDraftId('opt'), text: '', isCorrect: true },
  { id: generateDraftId('opt'), text: '', isCorrect: false },
  { id: generateDraftId('opt'), text: '', isCorrect: false },
  { id: generateDraftId('opt'), text: '', isCorrect: false },
]

export const ManualTestCreationModal: React.FC<ManualTestCreationModalProps> = ({
  isOpen,
  onClose,
  onTestCreated,
}) => {
  const addToast = useStore(state => state.addToast)

  // Step state: 1 = Details, 2 = Questions
  const [step, setStep] = useState<1 | 2>(1)

  // Test metadata
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<TestMode>('practice')
  const [difficulty, setDifficulty] = useState<TestDifficulty>('mixed')
  const [timeLimit, setTimeLimit] = useState(30)
  const [passingScore, setPassingScore] = useState(60)
  const [negativeMarks, setNegativeMarks] = useState(0)
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)

  // Questions list
  const [questions, setQuestions] = useState<DraftQuestion[]>([])

  // Active question being added/edited
  const [qText, setQText] = useState('')
  const [qType, setQType] = useState<QuestionType>('MCQ')
  const [qPoints, setQPoints] = useState(4)
  const [qTopic, setQTopic] = useState('')
  const [qExplanation, setQExplanation] = useState('')
  const [options, setOptions] = useState<DraftOption[]>(createDefaultOptions)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewMath, setPreviewMath] = useState(false)

  const handleAddOption = () => {
    setOptions(prev => [...prev, { id: generateDraftId('opt'), text: '', isCorrect: false }])
  }

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      addToast({ message: 'Questions must have at least 2 options', type: 'warning' })
      return
    }
    setOptions(prev => prev.filter(opt => opt.id !== id))
  }

  const handleOptionChange = (id: string, text: string) => {
    setOptions(prev => prev.map(opt => (opt.id === id ? { ...opt, text } : opt)))
  }

  const handleOptionCorrectToggle = (id: string) => {
    if (qType === 'MCQ' || qType === 'TRUE_FALSE') {
      // Single select
      setOptions(prev => prev.map(opt => ({ ...opt, isCorrect: opt.id === id })))
    } else {
      // Multi-select
      setOptions(prev =>
        prev.map(opt => (opt.id === id ? { ...opt, isCorrect: !opt.isCorrect } : opt))
      )
    }
  }

  const handleAddQuestion = () => {
    if (!qText.trim()) {
      addToast({ message: 'Please enter question text', type: 'warning' })
      return
    }

    if (qType === 'MCQ' || qType === 'MSQ' || qType === 'TRUE_FALSE') {
      const filledOptions = options.filter(o => o.text.trim())
      if (filledOptions.length < 2) {
        addToast({ message: 'Please provide at least 2 non-empty options', type: 'warning' })
        return
      }
      const hasCorrect = filledOptions.some(o => o.isCorrect)
      if (!hasCorrect) {
        addToast({ message: 'Please mark at least one option as correct', type: 'warning' })
        return
      }
    }

    const newQuestion: DraftQuestion = {
      id: generateDraftId('q'),
      text: qText.trim(),
      type: qType,
      points: qPoints,
      topic: qTopic.trim() || 'General',
      explanation: qExplanation.trim(),
      options: options.filter(o => o.text.trim()),
    }

    setQuestions(prev => [...prev, newQuestion])

    // Reset question form
    setQText('')
    setQExplanation('')
    setOptions(createDefaultOptions())
    addToast({ message: `Question ${questions.length + 1} added!`, type: 'success' })
  }

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || title.trim().length < 3) {
      addToast({ message: 'Test title must be at least 3 characters', type: 'warning' })
      setStep(1)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await testsAService.createTest({
        title: title.trim(),
        description: description.trim() || undefined,
        mode,
        difficulty,
        timeLimit,
        passingScore,
        negativeMarks,
        shuffleQuestions,
        shuffleOptions,
        isPublished: true,
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          points: q.points,
          topic: q.topic,
          explanation: q.explanation,
          options: q.options.map((opt, i) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: i + 1,
          })),
        })),
      })

      if (response.status === 'success' && response.data) {
        addToast({ message: '🎉 Custom Test published successfully!', type: 'success' })
        onTestCreated(response.data)
        onClose()
      } else {
        throw new Error('Failed to create test')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish test'
      addToast({ message: msg, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    title,
    description,
    mode,
    difficulty,
    timeLimit,
    passingScore,
    negativeMarks,
    shuffleQuestions,
    shuffleOptions,
    questions,
    addToast,
    onTestCreated,
    onClose,
  ])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Manual Test Authoring Wizard
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Step {step} of 2:{' '}
                  {step === 1 ? 'Test Information & Policies' : 'Author Questions'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
            <button
              onClick={() => setStep(1)}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                step === 1
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              1. Test Metadata
            </button>
            <button
              onClick={() => {
                if (!title.trim()) {
                  addToast({ message: 'Please give your test a title first', type: 'info' })
                }
                setStep(2)
              }}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                step === 2
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              2. Questions ({questions.length})
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Test Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Advanced Calculus & Differential Equations Practice"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the target audience, curriculum, and exam focus..."
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Mode
                    </label>
                    <select
                      value={mode}
                      onChange={e => setMode(e.target.value as TestMode)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="practice">Practice (Instant Hints & Explanations)</option>
                      <option value="mock">Mock Exam (Whole test evaluation)</option>
                      <option value="timed_challenge">Timed Challenge</option>
                      <option value="adaptive">Adaptive CAT (IRT Calibrated)</option>
                      <option value="contest">Contest Arena</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={e => setDifficulty(e.target.value as TestDifficulty)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Time Limit (Minutes)
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={timeLimit}
                        onChange={e => setTimeLimit(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">0 = Untimed practice</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Passing Score (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={passingScore}
                        onChange={e => setPassingScore(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Negative Marks / Question
                    </label>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={negativeMarks}
                        onChange={e => setNegativeMarks(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Anti-Cheat & Randomization Settings */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Anti-Cheat & Candidate Randomization
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        aria-label="Shuffle Question Sequence"
                        checked={shuffleQuestions}
                        onChange={e => setShuffleQuestions(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-gray-900 dark:text-white">
                          <Shuffle className="w-3.5 h-3.5 text-blue-500" />
                          <span>Shuffle Question Sequence</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Deterministically randomizes question order per attempt to mitigate screen
                          peering.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-800/70 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        aria-label="Shuffle Option Choices"
                        checked={shuffleOptions}
                        onChange={e => setShuffleOptions(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-gray-900 dark:text-white">
                          <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Shuffle Option Choices</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Randomizes MCQ / MSQ option ordering per candidate while preserving exact
                          answer keys.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Existing Questions List */}
                {questions.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Added Questions ({questions.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="flex items-start justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-xs"
                        >
                          <div className="flex items-start gap-2 flex-1 mr-2">
                            <span className="font-bold text-gray-500">#{idx + 1}</span>
                            <div className="line-clamp-2 text-gray-800 dark:text-gray-200">
                              <MathRenderer text={q.text} inline />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                              {q.points} pts
                            </span>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Authoring Box */}
                <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 space-y-4 bg-gray-50/30 dark:bg-gray-800/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-blue-600" />
                      Add Question #{questions.length + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setPreviewMath(!previewMath)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                        previewMath
                          ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      {previewMath ? 'Edit LaTeX' : 'Preview LaTeX Math ($...$)'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Question Prompt (Supports LaTeX like $\int x dx$ or $x^2$) *
                    </label>
                    {previewMath ? (
                      <div className="p-3 min-h-[80px] rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/20 text-sm">
                        <MathRenderer text={qText || '(No text entered)'} />
                      </div>
                    ) : (
                      <textarea
                        value={qText}
                        onChange={e => setQText(e.target.value)}
                        rows={3}
                        aria-label="Question Prompt"
                        placeholder="Type your question prompt here... (e.g. What is the value of $\lim_{x \to 0} \frac{\sin x}{x}$?)"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Question Type
                      </label>
                      <select
                        value={qType}
                        onChange={e => setQType(e.target.value as QuestionType)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        <option value="MCQ">Single Choice MCQ</option>
                        <option value="MSQ">Multiple Select (MSQ)</option>
                        <option value="TRUE_FALSE">True / False</option>
                        <option value="NUMERICAL">Numerical Value</option>
                        <option value="SUBJECTIVE">Subjective Essay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Marks / Points
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={qPoints}
                        onChange={e => setQPoints(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Topic Tag
                      </label>
                      <input
                        type="text"
                        value={qTopic}
                        onChange={e => setQTopic(e.target.value)}
                        placeholder="e.g. Calculus, Optics"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Options Builder */}
                  {(qType === 'MCQ' || qType === 'MSQ' || qType === 'TRUE_FALSE') && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span>Answer Options (Select correct answer on the left)</span>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Option
                        </button>
                      </div>

                      <div className="space-y-2">
                        {options.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOptionCorrectToggle(opt.id)}
                              className={`w-5 h-5 rounded-${qType === 'MSQ' ? 'md' : 'full'} border flex items-center justify-center shrink-0 transition-colors ${
                                opt.isCorrect
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                              }`}
                              title={opt.isCorrect ? 'Correct option' : 'Mark as correct'}
                            >
                              {opt.isCorrect && <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => handleOptionChange(opt.id, e.target.value)}
                              placeholder={`Option ${idx + 1} (${String.fromCharCode(65 + idx)}) text...`}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                            {options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(opt.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="Remove option"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Detailed Explanation / Solution Steps
                    </label>
                    <textarea
                      value={qExplanation}
                      onChange={e => setQExplanation(e.target.value)}
                      rows={2}
                      placeholder="Explain the step-by-step logic and formula derivation..."
                      className="w-full px-3.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddQuestion}
                    variant="outline"
                    className="w-full text-xs py-2 border-dashed border-2 flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <Plus className="w-4 h-4" /> Add Question to Test
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            {step === 1 ? (
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!title.trim()) {
                      addToast({ message: 'Please enter a test title', type: 'warning' })
                      return
                    }
                    setStep(2)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next: Add Questions &rarr;
                </Button>
              </div>
            ) : (
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={() => setStep(1)}>
                  &larr; Back to Details
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {questions.length} question{questions.length === 1 ? '' : 's'} staged
                  </span>
                  <Button
                    variant="primary"
                    onClick={() => void handleSubmit()}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isSubmitting
                      ? 'Publishing...'
                      : questions.length > 0
                        ? `Publish Test (${questions.length} Questions)`
                        : 'Publish Test Now'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ManualTestCreationModal

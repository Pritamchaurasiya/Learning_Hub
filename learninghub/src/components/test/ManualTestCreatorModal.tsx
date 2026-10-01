import React, { useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  Eye,
  Save,
  Clock,
  Layers,
} from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { MathRenderer } from '../MathRenderer'
import { testsAService, TestA } from '../../services/testsAService'
import { useStore } from '../../stores/useStore'

export interface ManualQuestionDraft {
  id: string
  text: string
  type: 'MCQ' | 'MSQ' | 'NUMERICAL' | 'TRUE_FALSE' | 'SUBJECTIVE'
  difficulty: number
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'
  points: number
  explanation?: string
  topic?: string
  options: Array<{
    id: string
    text: string
    isCorrect: boolean
    explanation?: string
  }>
}

export interface ManualTestCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onTestCreated: (test: TestA) => void
}

export const ManualTestCreatorModal: React.FC<ManualTestCreatorModalProps> = ({
  isOpen,
  onClose,
  onTestCreated,
}) => {
  const addToast = useStore(state => state.addToast)

  // Step state
  const [currentStep, setCurrentStep] = useState<'blueprint' | 'questions'>('blueprint')

  // Blueprint metadata
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'practice' | 'mock' | 'contest'>('practice')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed')
  const [timeLimit, setTimeLimit] = useState<number>(30)
  const [passingScore, setPassingScore] = useState<number>(60)
  const [negativeMarks, setNegativeMarks] = useState<number>(0)

  // Questions list
  const [questions, setQuestions] = useState<ManualQuestionDraft[]>([
    {
      id: 'q-1',
      text: 'What is the value of $\\lim_{x \\to 0} \\frac{\\sin x}{x}$?',
      type: 'MCQ',
      difficulty: 1.0,
      bloomLevel: 'UNDERSTAND',
      points: 4,
      explanation: 'By L’Hôpital’s Rule or standard trigonometric limit, the result is 1.',
      topic: 'Calculus',
      options: [
        { id: 'opt-1-1', text: '0', isCorrect: false },
        { id: 'opt-1-2', text: '1', isCorrect: true },
        { id: 'opt-1-3', text: '$\\infty$', isCorrect: false },
        { id: 'opt-1-4', text: 'Undefined', isCorrect: false },
      ],
    },
  ])

  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0)
  const [previewMath, setPreviewMath] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const activeQuestion = questions[activeQuestionIdx]

  // Add a new question draft
  const handleAddQuestion = useCallback(() => {
    const newQ: ManualQuestionDraft = {
      id: `q-${Date.now()}`,
      text: '',
      type: 'MCQ',
      difficulty: 1.0,
      bloomLevel: 'UNDERSTAND',
      points: 4,
      explanation: '',
      topic: '',
      options: [
        { id: `opt-${Date.now()}-1`, text: 'Option A', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Option B', isCorrect: false },
      ],
    }
    setQuestions(prev => [...prev, newQ])
    setActiveQuestionIdx(questions.length)
  }, [questions.length])

  // Remove a question draft
  const handleRemoveQuestion = useCallback(
    (index: number) => {
      if (questions.length <= 1) {
        addToast({ message: 'A test must have at least one question.', type: 'error' })
        return
      }
      setQuestions(prev => prev.filter((_, i) => i !== index))
      if (activeQuestionIdx >= index && activeQuestionIdx > 0) {
        setActiveQuestionIdx(activeQuestionIdx - 1)
      }
    },
    [questions.length, activeQuestionIdx, addToast]
  )

  // Update active question attributes
  const handleUpdateActiveQuestion = useCallback(
    (patch: Partial<ManualQuestionDraft>) => {
      setQuestions(prev => {
        const next = [...prev]
        next[activeQuestionIdx] = { ...next[activeQuestionIdx], ...patch }
        return next
      })
    },
    [activeQuestionIdx]
  )

  // Options management for active question
  const handleAddOption = useCallback(() => {
    if (!activeQuestion) return
    const newOption = {
      id: `opt-${Date.now()}-${activeQuestion.options.length + 1}`,
      text: `Option ${String.fromCharCode(65 + activeQuestion.options.length)}`,
      isCorrect: false,
    }
    handleUpdateActiveQuestion({
      options: [...activeQuestion.options, newOption],
    })
  }, [activeQuestion, handleUpdateActiveQuestion])

  const handleRemoveOption = useCallback(
    (optIdx: number) => {
      if (!activeQuestion) return
      if (activeQuestion.options.length <= 2) {
        addToast({ message: 'MCQ questions require at least 2 options.', type: 'error' })
        return
      }
      const updated = activeQuestion.options.filter((_, i) => i !== optIdx)
      handleUpdateActiveQuestion({ options: updated })
    },
    [activeQuestion, handleUpdateActiveQuestion, addToast]
  )

  const handleUpdateOption = useCallback(
    (optIdx: number, patch: Partial<ManualQuestionDraft['options'][0]>) => {
      if (!activeQuestion) return
      const updated = [...activeQuestion.options]
      updated[optIdx] = { ...updated[optIdx], ...patch }

      // If MCQ or TRUE_FALSE and setting isCorrect to true, unset others
      if (
        (activeQuestion.type === 'MCQ' || activeQuestion.type === 'TRUE_FALSE') &&
        patch.isCorrect
      ) {
        updated.forEach((opt, i) => {
          if (i !== optIdx) opt.isCorrect = false
        })
      }

      handleUpdateActiveQuestion({ options: updated })
    },
    [activeQuestion, handleUpdateActiveQuestion]
  )

  // Total points calculation
  const totalComputedMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0)
  }, [questions])

  // Validation
  const validateForm = useCallback((): string | null => {
    if (!title.trim()) {
      return 'Test Title is required.'
    }
    if (questions.length === 0) {
      return 'At least one question is required.'
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        return `Question #${i + 1} has no prompt text.`
      }
      if (q.type === 'MCQ' || q.type === 'MSQ' || q.type === 'TRUE_FALSE') {
        if (!q.options || q.options.length < 2) {
          return `Question #${i + 1} must have at least 2 options.`
        }
        const hasCorrect = q.options.some(o => o.isCorrect)
        if (!hasCorrect) {
          return `Question #${i + 1} has no correct option selected.`
        }
      }
    }
    return null
  }, [title, questions])

  // Submit test creation
  const handleSaveTest = useCallback(async () => {
    const error = validateForm()
    if (error) {
      addToast({ message: error, type: 'error' })
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        timeLimit,
        passingScore,
        mode: mode.toUpperCase(),
        difficulty: difficulty.toUpperCase(),
        totalMarks: totalComputedMarks,
        negativeMarks,
        isPublished: true,
        questions: questions.map(q => ({
          text: q.text.trim(),
          type: q.type,
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
          points: q.points,
          explanation: q.explanation?.trim() || undefined,
          topic: q.topic?.trim() || undefined,
          options: q.options.map((opt, oIdx) => ({
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
            explanation: opt.explanation?.trim() || undefined,
            order: oIdx + 1,
          })),
        })),
      }

      const res = await testsAService.createTest(payload)
      addToast({
        message: `🎉 Test "${res.data.title}" successfully created with ${questions.length} questions!`,
        type: 'success',
      })
      onTestCreated(res.data)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create test'
      addToast({ message: msg, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    validateForm,
    addToast,
    title,
    description,
    timeLimit,
    passingScore,
    mode,
    difficulty,
    totalComputedMarks,
    negativeMarks,
    questions,
    onTestCreated,
    onClose,
  ])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Instructor Manual Test Authoring Wizard"
      description="Design custom exams, author multi-type questions, and render LaTeX formulas in real time."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>
              {questions.length} Question{questions.length !== 1 ? 's' : ''} | Total Marks:{' '}
              {totalComputedMarks}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentStep === 'blueprint' ? (
              <Button
                variant="primary"
                onClick={() => {
                  if (!title.trim()) {
                    addToast({ message: 'Please provide a test title first.', type: 'error' })
                    return
                  }
                  setCurrentStep('questions')
                }}
              >
                Next: Add Questions
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCurrentStep('blueprint')}>
                  Back to Settings
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveTest}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Publishing...' : 'Publish Test'}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {/* Wizard Step Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-800 mb-6">
        <button
          onClick={() => setCurrentStep('blueprint')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            currentStep === 'blueprint'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          1. Blueprint & Exam Rules
        </button>
        <button
          onClick={() => {
            if (!title.trim()) {
              addToast({ message: 'Please provide a test title first.', type: 'error' })
              return
            }
            setCurrentStep('questions')
          }}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            currentStep === 'questions'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          2. Question Authoring ({questions.length})
        </button>
      </div>

      {currentStep === 'blueprint' && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Test Title *
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Advanced Calculus & Differential Equations Mock"
              className="w-full text-base font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Description / Instructions
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide test overview, instructions, reference material, or special rules..."
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Assessment Mode
              </label>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as 'practice' | 'mock' | 'contest')}
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="practice">Practice (Instant feedback)</option>
                <option value="mock">Mock Exam (Timed simulation)</option>
                <option value="contest">Contest (Strict proctored)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Target Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e =>
                  setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'mixed')
                }
                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              >
                <option value="mixed">Mixed Difficulty</option>
                <option value="easy">Beginner / Easy</option>
                <option value="medium">Intermediate / Medium</option>
                <option value="hard">Advanced / Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Time Limit (Minutes)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={timeLimit}
                  onChange={e => setTimeLimit(Number(e.target.value))}
                  className="w-full pr-8"
                />
                <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Passing Score (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={e => setPassingScore(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Negative Marks / Wrong Answer
              </label>
              <Input
                type="number"
                min={0}
                step={0.25}
                value={negativeMarks}
                onChange={e => setNegativeMarks(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {currentStep === 'questions' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[460px]">
          {/* Question List Sidebar */}
          <div className="md:col-span-4 border-r border-gray-200 dark:border-gray-800 pr-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Questions ({questions.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                className="flex items-center gap-1 text-xs py-1 px-2.5 h-auto text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question
              </Button>
            </div>

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  onClick={() => setActiveQuestionIdx(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                    idx === activeQuestionIdx
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-sm'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 mr-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-semibold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs truncate font-medium">
                      {q.text.trim() || 'Untitled Question'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleRemoveQuestion(idx)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors shrink-0"
                    title="Delete question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Question Editor */}
          {activeQuestion ? (
            <div className="md:col-span-8 space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Question {activeQuestionIdx + 1} Editor</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase font-semibold">
                    {activeQuestion.type}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewMath(!previewMath)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    previewMath
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                      : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {previewMath ? 'Math Preview: ON' : 'Math Preview: OFF'}
                </button>
              </div>

              {/* Type, Bloom, Points row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Question Type
                  </label>
                  <select
                    value={activeQuestion.type}
                    onChange={e =>
                      handleUpdateActiveQuestion({
                        type: e.target.value as ManualQuestionDraft['type'],
                      })
                    }
                    className="w-full p-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="MCQ">Single Choice (MCQ)</option>
                    <option value="MSQ">Multiple Choice (MSQ)</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="NUMERICAL">Numerical Value</option>
                    <option value="SUBJECTIVE">Subjective / Descriptive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Bloom's Taxonomy
                  </label>
                  <select
                    value={activeQuestion.bloomLevel}
                    onChange={e =>
                      handleUpdateActiveQuestion({
                        bloomLevel: e.target.value as ManualQuestionDraft['bloomLevel'],
                      })
                    }
                    className="w-full p-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="REMEMBER">Remember</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYZE">Analyze</option>
                    <option value="EVALUATE">Evaluate</option>
                    <option value="CREATE">Create</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Marks / Points
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={activeQuestion.points}
                    onChange={e =>
                      handleUpdateActiveQuestion({ points: Number(e.target.value) || 1 })
                    }
                    className="w-full text-xs p-2 h-auto"
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Question Prompt (Supports LaTeX $...$ and $$...$$) *
                  </label>
                  <span className="text-[10px] text-gray-400">e.g. Find $\int x^2 dx$</span>
                </div>
                <textarea
                  value={activeQuestion.text}
                  onChange={e => handleUpdateActiveQuestion({ text: e.target.value })}
                  rows={3}
                  placeholder="Type question prompt here. Math can be written as $E = mc^2$ or $$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$"
                  className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 resize-y"
                />

                {/* Live Math Preview */}
                {previewMath && activeQuestion.text.trim() && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-sm">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Rendered Preview:
                    </span>
                    <MathRenderer text={activeQuestion.text} />
                  </div>
                )}
              </div>

              {/* Options Section (For MCQ, MSQ, TRUE_FALSE) */}
              {(activeQuestion.type === 'MCQ' ||
                activeQuestion.type === 'MSQ' ||
                activeQuestion.type === 'TRUE_FALSE') && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Options & Correct Answer
                    </label>
                    {activeQuestion.type !== 'TRUE_FALSE' && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        Add Option
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {activeQuestion.options.map((opt, optIdx) => (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                          opt.isCorrect
                            ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/50'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateOption(optIdx, { isCorrect: !opt.isCorrect })}
                          className={`w-6 h-6 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            opt.isCorrect
                              ? 'bg-green-500 border-green-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-gray-400'
                          }`}
                          title={opt.isCorrect ? 'Correct option' : 'Mark as correct'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <div className="flex-1">
                          <Input
                            value={opt.text}
                            onChange={e => handleUpdateOption(optIdx, { text: e.target.value })}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)} text...`}
                            className="text-xs py-1.5 h-auto w-full"
                          />
                        </div>

                        {previewMath && opt.text.includes('$') && (
                          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs shrink-0 max-w-[120px] truncate">
                            <MathRenderer text={opt.text} inline />
                          </div>
                        )}

                        {activeQuestion.type !== 'TRUE_FALSE' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(optIdx)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded shrink-0"
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

              {/* Topic & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Topic / Concept Tag
                  </label>
                  <Input
                    value={activeQuestion.topic || ''}
                    onChange={e => handleUpdateActiveQuestion({ topic: e.target.value })}
                    placeholder="e.g. Integration, Mechanics, Reactivity"
                    className="w-full text-xs py-1.5 h-auto"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Difficulty Weight (0.1 - 5.0)
                  </label>
                  <Input
                    type="number"
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    value={activeQuestion.difficulty}
                    onChange={e =>
                      handleUpdateActiveQuestion({
                        difficulty: Number(e.target.value) || 1.0,
                      })
                    }
                    className="w-full text-xs py-1.5 h-auto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Explanation / Solution Note (LaTeX supported)
                </label>
                <textarea
                  value={activeQuestion.explanation || ''}
                  onChange={e => handleUpdateActiveQuestion({ explanation: e.target.value })}
                  rows={2}
                  placeholder="Explain why the answer is correct for the student review screen..."
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="md:col-span-8 flex items-center justify-center p-8 text-gray-400">
              Select or add a question to edit
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

export default ManualTestCreatorModal

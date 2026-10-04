import { memo } from 'react'
import { motion } from 'framer-motion'
import { Flag, CheckCircle, Lock, Sparkles, Lightbulb } from 'lucide-react'
import { MathRenderer } from '../MathRenderer'
import { Button } from '../ui/Button'
import type { TestQuestion } from '../../services/testsAService'

export interface QuestionCardProps {
  question: TestQuestion
  currentIndex: number
  totalQuestions: number
  selectedAnswer: string | string[] | null
  isFlagged: boolean
  onAnswer: (optionId: string | string[]) => void
  onConfidenceChange: (confidence: string) => void
  confidence: string | undefined
  onFlag: () => void
  onUnflag: () => void
  assessmentMode?: string
  practiceChecked?: boolean
  onCheckPracticeAnswer?: () => void
  onDiagnoseMisconception?: () => void
  sectionTitle?: string
  isSectionLocked?: boolean
}

export const QuestionCard = memo(
  ({
    question,
    currentIndex,
    totalQuestions,
    selectedAnswer,
    confidence,
    isFlagged,
    onAnswer,
    onConfidenceChange,
    onFlag,
    onUnflag,
    assessmentMode,
    practiceChecked,
    onCheckPracticeAnswer,
    onDiagnoseMisconception,
    sectionTitle,
    isSectionLocked,
  }: QuestionCardProps) => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            {sectionTitle && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                {sectionTitle}
              </span>
            )}
            <button
              onClick={isFlagged ? onUnflag : onFlag}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                isFlagged
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              <Flag className="w-4 h-4" />
              {isFlagged ? 'Flagged' : 'Flag'}
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {Math.round(((currentIndex + 1) / totalQuestions) * 100)}% Complete
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 sm:p-6 md:p-8 shadow-md border border-gray-100 dark:border-gray-800 backdrop-blur-xl">
          {isSectionLocked && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-sm">Section Finalized & Locked</span>
                Answers in this section are sealed and cannot be modified under examination rules.
              </div>
            </div>
          )}
          <MathRenderer
            text={question.text}
            className="text-xl font-medium text-gray-900 dark:text-white mb-8 leading-relaxed"
          />

          <div className="space-y-3">
            {question.question_type === 'subjective' || question.type === 'subjective' ? (
              <textarea
                value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                onChange={e => onAnswer(e.target.value)}
                disabled={isSectionLocked}
                placeholder={isSectionLocked ? 'Section is locked.' : 'Type your detailed answer here...'}
                className="w-full min-h-[200px] p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-y disabled:opacity-60 disabled:cursor-not-allowed"
              />
            ) : !question.options ||
              question.options.length === 0 ||
              question.question_type === 'numerical' ||
              question.type === 'numerical' ||
              question.question_type === 'fill_blank' ||
              question.type === 'fill_blank' ? (
              <div className="space-y-2">
                <input
                  type={
                    question.question_type === 'numerical' || question.type === 'numerical'
                      ? 'number'
                      : 'text'
                  }
                  value={typeof selectedAnswer === 'string' ? selectedAnswer : ''}
                  onChange={e => onAnswer(e.target.value)}
                  disabled={isSectionLocked}
                  placeholder={isSectionLocked ? 'Section is locked.' : 'Type your answer here...'}
                  className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                />
                <span className="text-xs text-gray-500">
                  {question.question_type === 'numerical' || question.type === 'numerical'
                    ? 'Enter a numerical value (1% tolerance applied)'
                    : 'Enter your answer value'}
                </span>
              </div>
            ) : (
              (question.options ?? []).map(option => {
                const isMultiSelect =
                  question.question_type === 'multiple_select' || question.type === 'MSQ'
                const isSelected = Array.isArray(selectedAnswer)
                  ? selectedAnswer.includes(option.id)
                  : selectedAnswer === option.id

                const handleSelect = () => {
                  if (isSectionLocked) return
                  if (isMultiSelect) {
                    const current = Array.isArray(selectedAnswer)
                      ? [...selectedAnswer]
                      : selectedAnswer
                        ? [selectedAnswer]
                        : []
                    const next = current.includes(option.id)
                      ? current.filter(id => id !== option.id)
                      : [...current, option.id]
                    onAnswer(next)
                  } else {
                    onAnswer(option.id)
                  }
                }

                return (
                  <motion.button
                    key={option.id}
                    whileHover={isSectionLocked ? undefined : { scale: 1.01 }}
                    whileTap={isSectionLocked ? undefined : { scale: 0.99 }}
                    onClick={handleSelect}
                    disabled={isSectionLocked}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${isSectionLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-${isMultiSelect ? 'md' : 'full'} border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <MathRenderer
                        text={option.text}
                        inline
                        className="text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>

          {/* Practice Mode Diagnostic & Socratic Scaffolding */}
          {assessmentMode === 'practice' && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Practice Mode: Test your intuition with instant feedback & Socratic AI</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onCheckPracticeAnswer && !practiceChecked && (
                  <Button
                    onClick={onCheckPracticeAnswer}
                    disabled={!selectedAnswer}
                    size="sm"
                    variant="primary"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Check Answer
                  </Button>
                )}
                {practiceChecked && onDiagnoseMisconception && (
                  <Button
                    onClick={onDiagnoseMisconception}
                    size="sm"
                    variant="outline"
                    className="text-xs text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-1.5"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Socratic AI Hint</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Confidence Meter */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              How confident are you in this answer?
            </h4>
            <div className="flex gap-3">
              {[
                {
                  level: 'LOW',
                  label: 'Low',
                  color:
                    'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
                  activeColor:
                    'bg-red-500 text-white dark:bg-red-600 dark:text-white ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-900',
                },
                {
                  level: 'MEDIUM',
                  label: 'Medium',
                  color:
                    'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50',
                  activeColor:
                    'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-gray-900',
                },
                {
                  level: 'HIGH',
                  label: 'High',
                  color:
                    'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
                  activeColor:
                    'bg-green-500 text-white dark:bg-green-600 dark:text-white ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900',
                },
              ].map(({ level, label, color, activeColor }) => (
                <button
                  key={level}
                  disabled={isSectionLocked}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={() => !isSectionLocked && onConfidenceChange(level as any)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    confidence === level ? activeColor : color
                  } ${isSectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

QuestionCard.displayName = 'QuestionCard'

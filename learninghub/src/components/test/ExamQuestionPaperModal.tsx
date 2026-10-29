import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, CheckCircle2, Bookmark, ArrowRight, Layers } from 'lucide-react'
import { MathRenderer } from '../MathRenderer'
import type { TestQuestion, TestSection } from '../../services/testsAService'

export interface ExamQuestionPaperModalProps {
  isOpen: boolean
  onClose: () => void
  questions: TestQuestion[]
  sections?: TestSection[]
  answers: Record<string, string | string[] | number | undefined>
  flaggedQuestions: string[]
  examLanguage: 'en' | 'hi'
  onSelectQuestion?: (index: number) => void
  onJumpToQuestion?: (index: number) => void
}

export const ExamQuestionPaperModal = memo(function ExamQuestionPaperModal({
  isOpen,
  onClose,
  questions,
  sections = [],
  answers,
  flaggedQuestions,
  examLanguage,
  onSelectQuestion,
  onJumpToQuestion,
}: ExamQuestionPaperModalProps) {
  const handleJump = onJumpToQuestion || onSelectQuestion || (() => {})
  if (!isOpen) return null

  // Group questions by section
  const sectionsList = sections.length > 0 ? sections : [{ id: 'all', title: 'Complete Examination', order: 1 }]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-900 dark:text-slate-100"
          role="dialog"
          aria-labelledby="qp-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-slate-950/90 border-b border-gray-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600/10 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 id="qp-modal-title" className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Official Question Paper View
                </h3>
                <span className="text-xs text-gray-500 dark:text-slate-400 block">
                  Complete view of all {questions.length} questions. Click any question card to jump to it.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-800 transition"
              aria-label="Close question paper view"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Questions Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 divide-y divide-gray-100 dark:divide-slate-800/80">
            {sectionsList.map(sec => {
              const secQuestions = questions.filter(
                q =>
                  sec.id === 'all' ||
                  q.section_id === sec.id ||
                  q.sectionId === sec.id
              )

              if (secQuestions.length === 0 && sectionsList.length > 1) return null

              return (
                <div key={sec.id} className="pt-6 first:pt-0 space-y-4">
                  {/* Section Title Banner */}
                  <div className="flex items-center justify-between bg-gray-100 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white">
                        {sec.title}
                      </span>
                    </div>
                    {sec.maxQuestionsToAttempt && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
                        Attempt ANY {sec.maxQuestionsToAttempt}
                      </span>
                    )}
                  </div>

                  {/* Section Questions */}
                  <div className="space-y-4">
                    {secQuestions.map(q => {
                      const globalIndex = questions.findIndex(item => item.id === q.id)
                      const rawAns = answers[q.id]
                      const isAnswered =
                        rawAns !== undefined &&
                        rawAns !== '' &&
                        (!Array.isArray(rawAns) || rawAns.length > 0)
                      const isFlagged = flaggedQuestions.includes(q.id)
                      const qText = examLanguage === 'hi' && (q.text_hi || q.hindi_text)
                        ? q.text_hi || q.hindi_text || q.text
                        : q.text

                      return (
                        <div
                          key={q.id}
                          className={`p-4 sm:p-5 rounded-xl border transition-all ${
                            isAnswered
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                              : 'bg-white dark:bg-slate-900/80 border-gray-200 dark:border-slate-800'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                {globalIndex + 1}
                              </span>
                              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">
                                {q.question_type || q.type || 'MCQ'} • {q.marks || 4} Marks
                              </span>
                              {isAnswered && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Answered
                                </span>
                              )}
                              {isFlagged && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                  <Bookmark className="w-3.5 h-3.5" /> Marked for Review
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleJump(globalIndex)
                                onClose()
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>Go to Question</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Question Text */}
                          <MathRenderer
                            text={qText}
                            className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3"
                          />

                          {/* Options Grid */}
                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {q.options.map((opt, optIdx) => {
                                const optText = examLanguage === 'hi' && opt.text_hi ? opt.text_hi : opt.text
                                const isSelected = Array.isArray(rawAns)
                                  ? rawAns.includes(opt.id)
                                  : rawAns === opt.id

                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                                      isSelected
                                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200 font-semibold'
                                        : 'bg-gray-50 dark:bg-slate-950/40 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <MathRenderer text={optText} inline className="flex-1" />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 dark:bg-slate-950/90 border-t border-gray-200 dark:border-slate-800 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
            >
              Close Question Paper
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
})

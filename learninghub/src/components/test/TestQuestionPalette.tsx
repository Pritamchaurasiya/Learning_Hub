import { memo } from 'react'

export interface TestQuestionPaletteProps {
  questions: Array<{ id: string }>
  currentIndex: number
  answers: Record<string, string | string[] | number | undefined>
  flaggedQuestions: string[]
  onSelectQuestion: (index: number) => void
}

export const TestQuestionPalette = memo(function TestQuestionPalette({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  onSelectQuestion,
}: TestQuestionPaletteProps) {
  const answeredCount = Object.values(answers).filter(
    v => v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
  ).length
  const unansweredCount = Math.max(0, questions.length - answeredCount)

  return (
    <div className="mb-6">
      <div className="flex flex-nowrap gap-1 sm:gap-2 mb-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-x-visible">
        {questions.map((q, index) => {
          const rawAns = answers[q.id]
          const isAnswered =
            rawAns !== undefined &&
            rawAns !== '' &&
            (!Array.isArray(rawAns) || rawAns.length > 0)
          const isCurrentFlagged = flaggedQuestions.includes(q.id)
          const isCurrent = index === currentIndex

          let btnClass =
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
          if (isCurrent) {
            btnClass =
              'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 font-bold shadow-sm'
          } else if (isAnswered && isCurrentFlagged) {
            btnClass =
              'bg-purple-100 text-purple-900 border-2 border-amber-400 dark:bg-purple-950/60 dark:text-purple-300 font-semibold'
          } else if (isAnswered) {
            btnClass =
              'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium'
          } else if (isCurrentFlagged) {
            btnClass =
              'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 font-medium'
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(index)}
              aria-label={`Go to question ${index + 1}: ${isAnswered ? 'answered' : 'unanswered'}${isCurrentFlagged ? ', flagged' : ''}${isCurrent ? ', current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={`w-10 h-10 rounded-lg text-sm transition-all relative ${btnClass}`}
              title={`Question ${index + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${isCurrentFlagged ? ' (Flagged)' : ''}`}
            >
              {index + 1}
              {isCurrentFlagged && !isCurrent && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white dark:border-gray-900" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-600" /> Current
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Answered ({answeredCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-400" /> Flagged ({flaggedQuestions.length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500 border border-amber-400" /> Flagged & Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-700" /> Unanswered ({unansweredCount})
        </span>
      </div>
    </div>
  )
})

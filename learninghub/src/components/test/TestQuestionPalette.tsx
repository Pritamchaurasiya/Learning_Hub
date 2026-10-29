import { useState, useMemo, memo } from 'react'

export interface TestQuestionPaletteProps {
  questions: Array<{ id: string }>
  currentIndex: number
  answers: Record<string, string | string[] | number | undefined>
  flaggedQuestions: string[]
  visitedQuestions?: string[]
  visitedQuestionIds?: string[]
  sections?: any[]
  activeSectionId?: string
  onSelectQuestion: (index: number) => void
}

export type PaletteFilter = 'all' | 'answered' | 'not_answered' | 'marked_review' | 'not_visited'

export const TestQuestionPalette = memo(function TestQuestionPalette({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  visitedQuestions = [],
  visitedQuestionIds,
    onSelectQuestion,
}: TestQuestionPaletteProps) {
  const [filter, setFilter] = useState<PaletteFilter>('all')

  // Calculate standard 5-state classifications
  const effectiveVisited = visitedQuestionIds || visitedQuestions

  const stats = useMemo(() => {
    let answered = 0
    let notAnswered = 0
    let markedReview = 0
    let answeredAndMarked = 0
    let notVisited = 0

    questions.forEach((q, idx) => {
      const rawAns = answers[q.id]
      const hasAnswer =
        rawAns !== undefined &&
        rawAns !== '' &&
        (!Array.isArray(rawAns) || rawAns.length > 0)
      const isFlagged = flaggedQuestions.includes(q.id)
      const isVisited =
        effectiveVisited.includes(q.id) || idx === currentIndex || hasAnswer || isFlagged

      if (hasAnswer && isFlagged) {
        answeredAndMarked++
      } else if (hasAnswer) {
        answered++
      } else if (isFlagged) {
        markedReview++
      } else if (isVisited) {
        notAnswered++
      } else {
        notVisited++
      }
    })

    return {
      answered,
      notAnswered,
      markedReview,
      answeredAndMarked,
      notVisited,
      totalAnswered: answered + answeredAndMarked,
    }
  }, [questions, answers, flaggedQuestions, visitedQuestions, currentIndex])

  return (
    <div className="w-full space-y-4" data-testid="test-question-palette">
      {/* Official 5-State Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800 text-[11px]">
        <button
          type="button"
          onClick={() => setFilter(filter === 'answered' ? 'all' : 'answered')}
          className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition ${
            filter === 'answered' ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
            {stats.answered}
          </span>
          <span className="text-gray-700 dark:text-slate-300 font-medium truncate">Answered</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'not_answered' ? 'all' : 'not_answered')}
          className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition ${
            filter === 'not_answered' ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
            {stats.notAnswered}
          </span>
          <span className="text-gray-700 dark:text-slate-300 font-medium truncate">Not Answered</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'not_visited' ? 'all' : 'not_visited')}
          className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition ${
            filter === 'not_visited' ? 'ring-2 ring-slate-400 bg-slate-100 dark:bg-slate-800' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">
            {stats.notVisited}
          </span>
          <span className="text-gray-700 dark:text-slate-300 font-medium truncate">Not Visited</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'marked_review' ? 'all' : 'marked_review')}
          className={`flex items-center gap-2 p-1.5 rounded-lg text-left transition col-span-2 sm:col-span-1 ${
            filter === 'marked_review' ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/40' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
            {stats.markedReview}
          </span>
          <span className="text-gray-700 dark:text-slate-300 font-medium truncate">Marked for Review</span>
        </button>

        <div className="flex items-center gap-2 p-1.5 rounded-lg text-left col-span-2">
          <div className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 relative">
            {stats.answeredAndMarked}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white dark:border-slate-900" />
          </div>
          <span className="text-gray-700 dark:text-slate-300 font-medium text-[10px] leading-tight">
            Ans & Marked (Evaluated in NTA): <strong className="text-purple-600 dark:text-purple-400">{stats.answeredAndMarked}</strong>
          </span>
        </div>
      </div>

      {/* Filter Reset pill if filter active */}
      {filter !== 'all' && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Filtering by: <strong className="capitalize text-blue-600 dark:text-blue-400">{filter.replace('_', ' ')}</strong>
          </span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            Show All
          </button>
        </div>
      )}

      {/* Question Buttons Matrix */}
      <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[360px] overflow-y-auto p-1 scrollbar-thin">
        {questions.map((q, index) => {
          const rawAns = answers[q.id]
          const isAnswered =
            rawAns !== undefined &&
            rawAns !== '' &&
            (!Array.isArray(rawAns) || rawAns.length > 0)
          const isCurrentFlagged = flaggedQuestions.includes(q.id)
          const isCurrent = index === currentIndex
          const isVisited =
            effectiveVisited.includes(q.id) || index === currentIndex || isAnswered || isCurrentFlagged

          // Filter matching
          if (filter === 'answered' && !isAnswered) return null
          if (filter === 'not_answered' && (!isVisited || isAnswered || isCurrentFlagged)) return null
          if (filter === 'marked_review' && !isCurrentFlagged) return null
          if (filter === 'not_visited' && isVisited) return null

          let btnClass = ''
          if (isCurrent) {
            btnClass =
              'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-900 font-extrabold shadow-md scale-105 z-10'
          } else if (isAnswered && isCurrentFlagged) {
            // State 5: Answered and Marked for Review
            btnClass =
              'bg-purple-600 text-white font-bold shadow-xs hover:bg-purple-700'
          } else if (isAnswered) {
            // State 3: Answered
            btnClass =
              'bg-emerald-600 text-white font-bold shadow-xs hover:bg-emerald-700'
          } else if (isCurrentFlagged) {
            // State 4: Marked for Review without answer
            btnClass =
              'bg-purple-600 text-white font-bold shadow-xs hover:bg-purple-700'
          } else if (isVisited) {
            // State 2: Not Answered (visited but skipped)
            btnClass =
              'bg-rose-600 text-white font-bold shadow-xs hover:bg-rose-700'
          } else {
            // State 1: Not Visited
            btnClass =
              'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-medium'
          }

          return (
            <button
              key={q.id}
              type="button"
              data-testid={`palette-question-${index + 1}`}
              onClick={() => onSelectQuestion(index)}
              aria-label={`Question ${index + 1}: ${
                isAnswered
                  ? isCurrentFlagged
                    ? 'answered and marked for review'
                    : 'answered'
                  : isCurrentFlagged
                    ? 'marked for review'
                    : isVisited
                      ? 'visited and not answered'
                      : 'not visited'
              }${isCurrent ? ', current question' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={`h-10 w-full rounded-xl text-xs sm:text-sm transition-all duration-150 relative flex items-center justify-center font-mono ${btnClass}`}
              title={`Question ${index + 1}: ${
                isAnswered
                  ? isCurrentFlagged
                    ? 'Answered & Marked for Review'
                    : 'Answered'
                  : isCurrentFlagged
                    ? 'Marked for Review'
                    : isVisited
                      ? 'Not Answered'
                      : 'Not Visited'
              }`}
            >
              {index + 1}

              {/* Green indicator dot on top-right for Answered & Marked for Review */}
              {isAnswered && isCurrentFlagged && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border border-white dark:border-slate-900 shadow-xs" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})

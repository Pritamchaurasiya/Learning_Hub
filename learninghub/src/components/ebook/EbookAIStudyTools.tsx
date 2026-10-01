import { useState } from 'react'
import { X, Sparkles, BookMarked, HelpCircle, Layers, CheckCircle2, ArrowRight } from 'lucide-react'
import type { EbookChapter } from '../../types/ebook'
import { ebookService } from '../../services/ebookService'

interface Props {
  isOpen: boolean
  onClose: () => void
  chapter: EbookChapter
  onOpenFlashcards: () => void
}

export function EbookAIStudyTools({ isOpen, onClose, chapter, onOpenFlashcards }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'glossary' | 'quiz'>('summary')
  const [isGenerating, setIsGenerating] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    summary: string
    keyTakeaways: string[]
    definitions: Array<{ term: string; definition: string }>
  } | null>(null)

  const [quizScore, setQuizScore] = useState<number | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})

  const DEMO_QUIZ = [
    {
      question:
        'Which asymptotic notation represents the exact tight bound where f(n) = O(g(n)) and f(n) = Omega(g(n))?',
      options: ['Big-O', 'Big-Theta (Θ)', 'Big-Omega (Ω)', 'Little-o'],
      correct: 'Big-Theta (Θ)',
      explanation: 'Big-Theta represents a tight bound from both above and below.',
    },
    {
      question:
        'In divide-and-conquer recurrence T(n) = aT(n/b) + f(n), when does Case 1 of Master Theorem apply?',
      options: [
        'When f(n) is polynomial smaller than n^(log_b a)',
        'When work is evenly balanced across levels',
        'When root node dominates the recurrence tree',
        'When b equals 1',
      ],
      correct: 'When f(n) is polynomial smaller than n^(log_b a)',
      explanation: 'Case 1 applies when subproblem leaf work strictly dominates root-level work.',
    },
  ]

  const handleGenerateSummary = async () => {
    setIsGenerating(true)
    try {
      const data = await ebookService.summarizeChapterAI(chapter.title, chapter.contentMarkdown)
      setSummaryData(data)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-slate-800 space-y-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg">AI Study & Mastery Suite</h3>
              <p className="text-xs text-gray-400 truncate max-w-md">{chapter.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 shrink-0">
          {[
            { id: 'summary', label: 'Executive Summary', icon: Sparkles },
            { id: 'glossary', label: 'Key Terms Glossary', icon: BookMarked },
            { id: 'quiz', label: 'Comprehension Quiz', icon: HelpCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'summary' | 'glossary' | 'quiz')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => {
              onClose()
              onOpenFlashcards()
            }}
            className="ml-auto px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Flashcards</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {!summaryData ? (
                <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-indigo-500 mx-auto animate-pulse" />
                  <h4 className="font-bold text-sm">Generate AI High-Yield Summary</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    Synthesize this chapter into executive bullet points, fundamental takeaways, and
                    formula sheets.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isGenerating ? 'Analyzing Chapter...' : 'Generate 3-Minute Summary'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-xs leading-relaxed space-y-2">
                    <span className="font-bold text-indigo-500 uppercase text-[10px] block">
                      Conceptual Overview
                    </span>
                    <p className="whitespace-pre-line text-gray-800 dark:text-gray-200">
                      {summaryData.summary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-400 block">
                      High-Yield Takeaways
                    </span>
                    <div className="grid gap-2">
                      {summaryData.keyTakeaways.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'glossary' && (
            <div className="space-y-3">
              {(chapter.glossary || []).length > 0 ? (
                chapter.glossary!.map(term => (
                  <div
                    key={term.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 space-y-1"
                  >
                    <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {term.term}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {term.definition}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 space-y-1">
                  <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                    Asymptotic Complexity
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    The rate of growth of runtime or memory as input size n approaches infinity.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-4">
              {DEMO_QUIZ.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-3"
                >
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {qIdx + 1}. {q.question}
                  </p>
                  <div className="grid gap-1.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIdx] === opt
                      const isCorrect = opt === q.correct
                      const showResult = quizScore !== null

                      return (
                        <button
                          key={optIdx}
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                          className={`p-2.5 rounded-xl text-xs text-left font-medium transition-all ${
                            showResult
                              ? isCorrect
                                ? 'bg-emerald-500 text-white font-bold'
                                : isSelected
                                  ? 'bg-rose-500 text-white font-bold'
                                  : 'bg-white dark:bg-slate-900 text-gray-400'
                              : isSelected
                                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {quizScore !== null && (
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-[11px] text-indigo-800 dark:text-indigo-300">
                      <span className="font-bold">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => {
                  let correct = 0
                  DEMO_QUIZ.forEach((q, idx) => {
                    if (selectedAnswers[idx] === q.correct) correct++
                  })
                  setQuizScore(correct)
                }}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>
                  {quizScore !== null
                    ? `Score: ${quizScore}/${DEMO_QUIZ.length} (Check Again)`
                    : 'Submit & Check Answers'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

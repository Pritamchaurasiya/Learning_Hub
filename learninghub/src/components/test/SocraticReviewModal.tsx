import { useState } from 'react'
import { X, Sparkles, HelpCircle, CheckCircle2, ChevronRight, Lightbulb } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  questionText: string
  selectedOptionText: string
  correctOptionText: string
  topic?: string
}

export function SocraticReviewModal({
  isOpen,
  onClose,
  questionText,
  selectedOptionText,
  correctOptionText,
  topic = 'Computer Science',
}: Props) {
  const [activeHintLevel, setActiveHintLevel] = useState(1)
  const [userRationale, setUserRationale] = useState('')
  const [submittedRationale, setSubmittedRationale] = useState(false)
  const [verificationPassed, setVerificationPassed] = useState(false)
  const [selectedVerification, setSelectedVerification] = useState<string | null>(null)

  if (!isOpen) return null

  const HINTS = [
    {
      level: 1,
      title: 'Concept Anchor & Core Theorem',
      content:
        'Recall the formal asymptotic definitions: Big-O bounds the function from above, whereas Big-Theta requires both tight upper and tight lower bounds simultaneously.',
    },
    {
      level: 2,
      title: 'Edge Case & Counterexample Analysis',
      content: `Notice why "${selectedOptionText}" fails: If the subproblem branching factor is smaller than the polynomial exponent, work is concentrated at the leaves rather than the root.`,
    },
    {
      level: 3,
      title: 'Step-by-Step Mathematical Derivation',
      content: `Correct derivation for "${correctOptionText}": By applying Master Theorem Case 1, since f(n) = O(n^(log_b a - epsilon)), the leaf overhead dominates, yielding T(n) = Theta(n^(log_b a)).`,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-gray-200 dark:border-slate-800 space-y-6 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Socratic AI Mistake Diagnosis</h3>
              <p className="text-[11px] text-gray-400">Targeting Topic: {topic}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Question Summary */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              Problem Review
            </span>
            <p className="text-xs font-bold text-gray-900 dark:text-white leading-relaxed">
              {questionText}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-medium">
                <span className="font-bold block text-[10px] uppercase">Your Choice:</span>
                {selectedOptionText}
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium">
                <span className="font-bold block text-[10px] uppercase">Correct Target:</span>
                {correctOptionText}
              </div>
            </div>
          </div>

          {/* Socratic Step 1: Articulate Rationale */}
          {!submittedRationale ? (
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <h4 className="font-bold text-xs">Diagnostic: What was your thought process?</h4>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Briefly explaining your reasoning helps the AI identify whether this was a
                calculation slip, formula confusion, or conceptual gap.
              </p>
              <textarea
                value={userRationale}
                onChange={e => setUserRationale(e.target.value)}
                placeholder="I thought that because the tree branches..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                rows={3}
              />
              <button
                onClick={() => setSubmittedRationale(true)}
                disabled={!userRationale.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                Analyze My Reasoning
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                <span>Progressive Scaffolded Hints</span>
                <span className="text-indigo-500 font-mono">Level {activeHintLevel} of 3</span>
              </div>

              {/* Hints */}
              <div className="space-y-2.5">
                {HINTS.slice(0, activeHintLevel).map(hint => (
                  <div
                    key={hint.level}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>
                        Hint {hint.level}: {hint.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed pl-5">
                      {hint.content}
                    </p>
                  </div>
                ))}
              </div>

              {activeHintLevel < 3 && (
                <button
                  onClick={() => setActiveHintLevel(lvl => lvl + 1)}
                  className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Reveal Next Deeper Hint</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Step 3: Understanding Verification Check */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                  Concept Mastery Check
                </span>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  If subproblem work at the leaves grows faster than the root function, what is the
                  asymptotic bound?
                </p>
                <div className="grid gap-1.5">
                  {['T(n) = Theta(f(n))', 'T(n) = Theta(n^(log_b a))', 'T(n) = O(log n)'].map(
                    (opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedVerification(opt)
                          if (opt === 'T(n) = Theta(n^(log_b a))') {
                            setVerificationPassed(true)
                          }
                        }}
                        className={`p-2 rounded-xl text-xs text-left font-medium transition-all ${
                          selectedVerification === opt
                            ? opt === 'T(n) = Theta(n^(log_b a))'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-rose-500 text-white font-bold'
                            : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
                {verificationPassed && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Misconception Resolved! Full mastery points awarded.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all shrink-0"
        >
          {verificationPassed ? 'Finish Socratic Review' : 'Close Review'}
        </button>
      </div>
    </div>
  )
}

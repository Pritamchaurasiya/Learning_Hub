import { useState } from 'react'
import { X, Layers, RotateCw, Check, ArrowRight, ArrowLeft } from 'lucide-react'
import type { EbookFlashcard } from '../../types/ebook'

interface Props {
  isOpen: boolean
  onClose: () => void
  flashcards: EbookFlashcard[]
}

export function EbookFlashcardDeck({ isOpen, onClose, flashcards }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredCount, setMasteredCount] = useState(0)

  if (!isOpen || flashcards.length === 0) return null

  const current = flashcards[currentIndex]

  const handleNext = (mastered = false) => {
    if (mastered) setMasteredCount(c => c + 1)
    setIsFlipped(false)
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(c => c + 1)
    }
  }

  const handlePrev = () => {
    setIsFlipped(false)
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-800 space-y-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="font-black text-base">Active Recall Flashcards</h3>
              <p className="text-[10px] text-gray-400">
                Card {currentIndex + 1} of {flashcards.length} · {masteredCount} Mastered
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Flip Card */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="min-h-[220px] rounded-3xl p-6 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-slate-500/10 border-2 border-purple-500/30 flex flex-col justify-between cursor-pointer hover:border-purple-500/50 transition-all shadow-inner relative group select-none"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-purple-500">
            <span>{isFlipped ? 'Answer & Derivation' : 'Question / Concept'}</span>
            <span className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
              <RotateCw className="w-3 h-3" /> Click to Flip
            </span>
          </div>

          <div className="text-center py-6">
            <p className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
              {isFlipped ? current.back : current.front}
            </p>
            {isFlipped && current.explanation && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic font-medium">
                {current.explanation}
              </p>
            )}
          </div>

          <div className="text-center text-[10px] text-gray-400 font-semibold">
            {isFlipped ? 'Tap to flip back' : 'Tap to reveal answer'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {isFlipped ? (
            <div className="flex-1 flex gap-2">
              <button
                onClick={() => handleNext(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Need Review
              </button>
              <button
                onClick={() => handleNext(true)}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Got It Right</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md"
            >
              Reveal Answer
            </button>
          )}

          <button
            onClick={() => handleNext(false)}
            disabled={currentIndex === flashcards.length - 1}
            className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

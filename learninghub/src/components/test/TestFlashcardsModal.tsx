import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, X, RotateCw, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TestFlashcardsModalProps {
  isOpen: boolean
  onClose: () => void
}

const flashcards = [
  {
    id: 'fc-1',
    subject: 'DSA',
    topic: 'Trees & Traversal',
    question:
      'Why does an Inorder traversal on a Binary Search Tree (BST) produce values in sorted ascending order?',
    answer:
      'In a BST, all keys in the left subtree are smaller than the root, and all keys in the right subtree are larger. Inorder recursively visits Left → Root → Right, guaranteeing strictly ascending order.',
    interval: '3 days',
  },
  {
    id: 'fc-2',
    subject: 'Physics',
    topic: 'Classical Mechanics',
    question: "How is Impulse mathematically related to Momentum according to Newton's Second Law?",
    answer:
      'Impulse J is the integral of Force over time (J = ∫ F dt), which equals the total change in momentum (Δp = m·v_f - m·v_i). Units: N·s or kg·m/s.',
    interval: '5 days',
  },
  {
    id: 'fc-3',
    subject: 'Maths',
    topic: 'Calculus',
    question:
      "What is the geometrical interpretation of the derivative f'(x) and definite integral ∫ f(x) dx?",
    answer:
      "f'(x) represents the instantaneous rate of change or the slope of the tangent line to the curve at x. The definite integral represents the signed area between the curve and the x-axis from a to b.",
    interval: '7 days',
  },
  {
    id: 'fc-4',
    subject: 'Coding',
    topic: 'Python Internals',
    question:
      'What is the key difference between a Python list and a tuple in memory allocation and mutability?',
    answer:
      'Lists are mutable and over-allocated in memory to accommodate dynamic appending (O(1) amortized). Tuples are immutable and allocated with fixed exact block size, making them faster, hashable, and thread-safe.',
    interval: '4 days',
  },
  {
    id: 'fc-5',
    subject: 'CS Core',
    topic: 'Operating Systems',
    question: 'What are the 4 Coffman conditions required for a deadlock to occur?',
    answer:
      '1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait. Eliminating any one condition prevents system deadlocks.',
    interval: '6 days',
  },
]

export const TestFlashcardsModal = memo(function TestFlashcardsModal({
  isOpen,
  onClose,
}: TestFlashcardsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)

  if (!isOpen) return null

  const card = flashcards[currentIndex]

  const handleNext = () => {
    setIsFlipped(false)
    setReviewedCount(c => c + 1)
    if (currentIndex + 1 < flashcards.length) {
      setCurrentIndex(c => c + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const handlePrev = () => {
    setIsFlipped(false)
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base">3D Spaced Flashcards</h3>
              <span className="text-xs text-gray-400">
                Card {currentIndex + 1} of {flashcards.length} · {reviewedCount} reviewed
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Flip Card Container */}
        <div
          onClick={() => setIsFlipped(f => !f)}
          className="relative min-h-[220px] rounded-2xl border border-white/10 bg-white/5 p-6 cursor-pointer hover:border-blue-400/50 transition-all flex flex-col justify-between select-none group shadow-inner mb-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {card.subject} · {card.topic}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-blue-300">
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isFlipped ? 'Show Question' : 'Click to Flip'}</span>
            </span>
          </div>

          <div className="my-auto py-3">
            {!isFlipped ? (
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400 block mb-1">
                  Question Prompt
                </span>
                <p className="text-lg font-bold text-white leading-relaxed">{card.question}</p>
              </div>
            ) : (
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 block mb-1">
                  Mastery Solution
                </span>
                <p className="text-sm font-medium text-gray-200 leading-relaxed whitespace-pre-line">
                  {card.answer}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/10">
            <span>SRS Interval: {card.interval}</span>
            <span className="text-blue-400 font-semibold">
              {isFlipped ? 'Answer Revealed' : 'Prompt'}
            </span>
          </div>
        </div>

        {/* SRS Rating Actions (When flipped) or Navigation */}
        {isFlipped ? (
          <div>
            <span className="text-xs text-gray-400 block text-center mb-2 font-medium">
              Rate Recall Ease (Schedules Next Repetition)
            </span>
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={handleNext}
                className="py-2 text-xs font-bold rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
              >
                Again (1d)
              </Button>
              <Button
                onClick={handleNext}
                className="py-2 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
              >
                Hard (3d)
              </Button>
              <Button
                onClick={handleNext}
                className="py-2 text-xs font-bold rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30"
              >
                Good (7d)
              </Button>
              <Button
                onClick={handleNext}
                className="py-2 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
              >
                Easy (14d)
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              variant="outline"
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border-white/10 text-gray-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <Button
              onClick={() => setIsFlipped(true)}
              className="py-2 px-5 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 shadow-md shadow-blue-500/25"
            >
              Reveal Answer
            </Button>
            <Button
              onClick={handleNext}
              variant="outline"
              className="flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border-white/10 text-gray-300"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
})

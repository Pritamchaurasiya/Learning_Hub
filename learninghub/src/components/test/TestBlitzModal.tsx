import { memo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Zap, Clock, Trophy, X, RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'

export interface TestBlitzModalProps {
  isOpen: boolean
  onClose: () => void
}

const blitzQuestions = [
  {
    q: 'Which data structure removes the oldest item first (FIFO)?',
    options: ['Stack', 'Queue', 'Tree', 'Heap'],
    answer: 1,
    subject: 'DSA',
  },
  {
    q: 'Time complexity of binary search on a sorted array?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    answer: 1,
    subject: 'DSA',
  },
  {
    q: 'A 2 kg body is pushed with net force 10 N. What is its acceleration?',
    options: ['5 m/s²', '20 m/s²', '0.2 m/s²', '12 m/s²'],
    answer: 0,
    subject: 'Physics',
  },
  {
    q: 'If f(x) = x², what is f′(3)?',
    options: ['3', '6', '9', '2'],
    answer: 1,
    subject: 'Maths',
  },
  {
    q: 'Which keyword defines a function in Python?',
    options: ['func', 'define', 'def', 'fn'],
    answer: 2,
    subject: 'Coding',
  },
  {
    q: 'Sum of roots of x² - 5x + 6 = 0?',
    options: ['5', '6', '-5', '1'],
    answer: 0,
    subject: 'Maths',
  },
  {
    q: 'SI unit of force is?',
    options: ['Joule', 'Watt', 'Newton', 'Pascal'],
    answer: 2,
    subject: 'Physics',
  },
  {
    q: 'Which traversal of BST visits keys in sorted ascending order?',
    options: ['Preorder', 'Postorder', 'Inorder', 'Level-order'],
    answer: 2,
    subject: 'DSA',
  },
  {
    q: 'What is the derivative d/dx of sin(x)?',
    options: ['cos(x)', '-cos(x)', '-sin(x)', 'tan(x)'],
    answer: 0,
    subject: 'Maths',
  },
  {
    q: 'Which Python collection type is immutable?',
    options: ['list', 'dict', 'tuple', 'set'],
    answer: 2,
    subject: 'Coding',
  },
  {
    q: 'What is the pH of a neutral aqueous solution at 25°C?',
    options: ['0', '7', '14', '1'],
    answer: 1,
    subject: 'Chemistry',
  },
  {
    q: 'Which layer of the OSI model handles end-to-end flow control (e.g. TCP)?',
    options: ['Network', 'Data Link', 'Transport', 'Session'],
    answer: 2,
    subject: 'CS Core',
  },
  {
    q: 'If 5 machines make 5 widgets in 5 minutes, how many minutes do 100 machines take to make 100 widgets?',
    options: ['5 minutes', '100 minutes', '20 minutes', '1 minute'],
    answer: 0,
    subject: 'Aptitude',
  },
]

export const TestBlitzModal = memo(function TestBlitzModal({
  isOpen,
  onClose,
}: TestBlitzModalProps) {
  const [timeLeft, setTimeLeft] = useState(60)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetGame = () => {
    setTimeLeft(60)
    setCurrentIndex(0)
    setScore(0)
    setStreak(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setIsGameOver(false)
  }

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    resetGame()

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setIsGameOver(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  const handleSelectOption = (idx: number) => {
    if (isAnswered || isGameOver) return
    setSelectedOption(idx)
    setIsAnswered(true)

    const currentQ = blitzQuestions[currentIndex]
    if (idx === currentQ.answer) {
      setScore(s => s + 10 + streak * 2)
      setStreak(st => st + 1)
    } else {
      setStreak(0)
    }

    // Auto-advance after brief pause
    setTimeout(() => {
      if (currentIndex + 1 < blitzQuestions.length) {
        setCurrentIndex(c => c + 1)
        setSelectedOption(null)
        setIsAnswered(false)
      } else {
        setIsGameOver(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, 550)
  }

  if (!isOpen) return null

  const currentQ = blitzQuestions[currentIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap className="w-5 h-5 fill-current" />
            </span>
            <div>
              <h3 className="font-bold text-base">60-Second Speed Blitz</h3>
              <span className="text-xs text-gray-400">
                Question {currentIndex + 1} of {blitzQuestions.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono font-bold text-sm border ${
                timeLeft <= 10
                  ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{timeLeft}s</span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Game State: Over or Active */}
        {isGameOver ? (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 mb-4 shadow-lg shadow-emerald-500/40">
              <Trophy className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h4 className="text-2xl font-extrabold text-white mb-1">Blitz Completed!</h4>
            <p className="text-sm text-gray-300 mb-6">
              Great rapid-fire accuracy under extreme time constraints.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-gray-400 block mb-1">Final Score</span>
                <b className="text-2xl font-black text-emerald-400">{score} pts</b>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-gray-400 block mb-1">Max Streak</span>
                <b className="text-2xl font-black text-amber-400">{streak}x</b>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                onClick={resetGame}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-white/20 text-white"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Score & Streak Bar */}
            <div className="flex items-center justify-between text-xs font-semibold mb-4 text-gray-300 px-1">
              <span>
                Score: <b className="text-emerald-400">{score}</b>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🔥 Streak: {streak}x
              </span>
              <span className="text-purple-300">Topic: {currentQ.subject}</span>
            </div>

            {/* Question Text */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 min-h-[90px] flex items-center">
              <p className="text-base font-bold text-white leading-relaxed">{currentQ.q}</p>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = selectedOption === oIdx
                const isCorrect = isAnswered && oIdx === currentQ.answer
                const isWrong = isAnswered && isSelected && oIdx !== currentQ.answer

                let btnClass =
                  'bg-white/5 border-white/10 text-gray-200 hover:border-purple-500/50 hover:bg-white/10'
                if (isCorrect) {
                  btnClass =
                    'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                } else if (isWrong) {
                  btnClass = 'bg-red-500/20 border-red-500 text-red-300'
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(oIdx)}
                    disabled={isAnswered}
                    className={`w-full p-3.5 rounded-xl border text-left font-medium text-sm flex items-center justify-between transition-all ${btnClass}`}
                  >
                    <span>{opt}</span>
                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
})

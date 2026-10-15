import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  RotateCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookmarkPlus,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { revisionService } from '../../services/revisionService'
import { useStore } from '../../stores/useStore'
import type { TestAttempt } from '../../services/testsAService'

export interface SocraticCard {
  id: string
  topic: string
  front: string
  back: string
  explanation: string
  hint: string
}

interface SocraticRemediationFlashcardsProps {
  attempt: TestAttempt
  onExportComplete?: (count: number) => void
}

export function SocraticRemediationFlashcards({
  attempt,
  onExportComplete,
}: SocraticRemediationFlashcardsProps) {
  const addToast = useStore(state => state.addToast)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [hasExported, setHasExported] = useState(false)

  // Generate Socratic flashcards based on attempt answers or curriculum domain
  const cards: SocraticCard[] = useMemo(() => {
    const rawAnswers = Array.isArray(attempt.answers) ? attempt.answers : []
    const incorrect = rawAnswers.filter(a => a.is_correct === false)

    if (incorrect.length > 0) {
      return incorrect.map((ans, idx) => {
        const topic = ans.topic || (attempt.test_title ? attempt.test_title.split(' ')[0] : 'Curriculum Core')
        return {
          id: ans.id || `card-${idx}`,
          topic,
          front: `Socratic Probe: In "${ans.question_text || 'this assessment problem'}", why was your selected choice insufficient? What fundamental invariant was violated?`,
          back: ans.text_answer || 'Review the correct condition and verify boundary constraints before executing.',
          explanation:
            (ans as any).explanation ||
            'Deep conceptual remediation: examine the underlying formal definition, algorithmic invariants, and potential edge-case branches.',
          hint: `Recall key principles in ${topic}: focus on asymptotic bounds, state immutability, or concurrent visibility rules.`,
        }
      })
    }

    // Default high-yield Socratic review cards derived from the assessment topic
    const testTitle =
      attempt.test_title ||
      (attempt as any).test?.title ||
      (typeof attempt.test === 'string' && attempt.test ? attempt.test : 'Core Academic Assessment')

    return [
      {
        id: 'socratic-default-1',
        topic: testTitle.split(' ')[0] || 'Foundations',
        front: `Socratic Probe: What critical trade-off is made when optimizing for latency versus consistency in ${testTitle}?`,
        back: 'CAP theorem dictates that under network partition (P), a distributed system must choose between Availability (low latency responses) and Consistency (linearizable read/write order).',
        explanation:
          'Pacelc theorem extends this: even when operating normally without partitions, there is an inherent trade-off between latency and consistency (L vs C).',
        hint: 'Consider the behavior of read-replicas under asynchronous replication logs.',
      },
      {
        id: 'socratic-default-2',
        topic: 'Algorithmic Complexity',
        front: `Socratic Probe: Why does maintaining an invariant enable formal induction proofs in recursive divide-and-conquer?`,
        back: 'Invariants guarantee that if a property holds prior to recursive partitioning, and is preserved across recombine steps, it holds globally at termination.',
        explanation:
          'Loop invariants and inductive hypotheses eliminate off-by-one errors and ensure correct convergence in logarithmic search and sorting.',
        hint: 'Think about binary search mid calculation and search space reduction.',
      },
      {
        id: 'socratic-default-3',
        topic: 'Error Resilience',
        front: 'Socratic Probe: How does the Transactional Outbox pattern prevent dual-write anomalies across relational databases and message brokers?',
        back: 'By persisting events directly into an "outbox" table within the same ACID database transaction as business entities, ensuring 100% atomicity.',
        explanation:
          'An asynchronous background relay process (e.g., Debezium CDC or polling publisher) delivers the outbox events to Kafka with at-least-once semantics.',
        hint: 'Consider what occurs if your application crashes immediately after writing to the database but before sending the Kafka network packet.',
      },
    ]
  }, [attempt])

  const currentCard = cards[currentIndex]

  const handleNext = () => {
    setIsFlipped(false)
    setShowHint(false)
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(c => c + 1)
    }
  }

  const handlePrev = () => {
    setIsFlipped(false)
    setShowHint(false)
    if (currentIndex > 0) {
      setCurrentIndex(c => c - 1)
    }
  }

  const handleExportToSpacedRevision = async () => {
    if (cards.length === 0 || hasExported) return
    setIsExporting(true)

    try {
      let createdCount = 0
      for (const card of cards) {
        await revisionService.createCustomCard({
          front: card.front,
          back: card.back,
          explanation: card.explanation,
          topic: card.topic,
          card_type: 'MISTAKE',
        })
        createdCount++
      }

      setHasExported(true)
      addToast({
        message: `Synced ${createdCount} Socratic active-recall flashcards to Spaced Revision Hub!`,
        type: 'success',
      })
      if (onExportComplete) onExportComplete(createdCount)
    } catch (err: any) {
      addToast({
        message: err?.message || 'Failed to export flashcards to Spaced Revision Hub.',
        type: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="p-5 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Socratic Active-Recall Remediation Deck
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                FSRS AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Card {currentIndex + 1} of {cards.length} · Topic: {currentCard.topic}
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <Button
          size="sm"
          onClick={handleExportToSpacedRevision}
          disabled={isExporting || hasExported}
          className={`text-xs flex items-center gap-1.5 ${
            hasExported
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {hasExported ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Synced to Revision Hub
            </>
          ) : (
            <>
              <BookmarkPlus className="w-3.5 h-3.5" />
              {isExporting ? 'Syncing...' : 'Sync to Spaced Revision'}
            </>
          )}
        </Button>
      </div>

      {/* 3D Flip Card Container */}
      <div className="perspective-1000">
        <motion.div
          onClick={() => setIsFlipped(!isFlipped)}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="relative min-h-[190px] rounded-2xl p-5 bg-white dark:bg-slate-950 border-2 border-indigo-200 dark:border-indigo-800/80 shadow-md cursor-pointer select-none flex flex-col justify-between hover:border-indigo-400 transition-colors"
          style={{ transformStyle: 'preserve-3d' }}
          data-testid="socratic-flashcard-flip"
        >
          {!isFlipped ? (
            /* Front Face */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Active Recall Prompt
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Click to reveal solution
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                {currentCard.front}
              </p>
            </div>
          ) : (
            /* Back Face */
            <div
              className="space-y-3"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Socratic Synthesis
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Click to return to prompt
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                {currentCard.back}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                {currentCard.explanation}
              </p>
            </div>
          )}

          {/* Footer note inside card */}
          <div
            className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between"
            style={{ transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
          >
            <span>SuperMemo SM-2 & FSRS Optimized</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              {isFlipped ? 'Concept Mastered' : 'Tap to Flip'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Socratic Hint Accordion */}
      <div className="space-y-2">
        <button
          onClick={() => setShowHint(!showHint)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showHint ? 'Hide Socratic Clue' : 'Need a Socratic Clue?'}
        </button>

        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{currentCard.hint}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="text-xs flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Previous
        </Button>

        {/* Indicator dots */}
        <div className="flex items-center gap-1.5">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-5 bg-indigo-600'
                  : 'w-1.5 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="text-xs flex items-center gap-1"
        >
          Next
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  )
}

export default SocraticRemediationFlashcards

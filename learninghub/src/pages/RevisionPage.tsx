import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Brain,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ArrowLeft,
  Zap,
  Bookmark,
  Layers,
  Award,
  X,
} from 'lucide-react'
import { revisionService } from '../services/revisionService'
import type { SpacedCard, DeckStats, RetentionStats, ReviewGrade, CardType } from '../types/revision'
import { SpacedRepetitionCard } from '../components/revision/SpacedRepetitionCard'
import { RetentionAnalyticsCard } from '../components/revision/RetentionAnalyticsCard'
import { Card } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'

export const RevisionPage: React.FC = () => {
  const { addToast } = useToast()
  const addToastRef = React.useRef(addToast)
  addToastRef.current = addToast

  // State
  const [cards, setCards] = useState<SpacedCard[]>([])
  const [deckStats, setDeckStats] = useState<DeckStats | null>(null)
  const [retentionStats, setRetentionStats] = useState<RetentionStats | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'DUE' | 'MISTAKE' | 'FORMULA' | 'CONCEPT' | 'QUESTION'>('DUE')
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0)
  const [gradeCounts, setGradeCounts] = useState<{ [grade: number]: number }>({ 1: 0, 2: 0, 4: 0, 5: 0 })

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [newExplanation, setNewExplanation] = useState('')
  const [newTopic, setNewTopic] = useState('General')
  const [newCardType, setNewCardType] = useState<CardType>('QUESTION')

  // Load Deck & Stats
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const typeParam = ['MISTAKE', 'FORMULA', 'CONCEPT', 'QUESTION'].includes(selectedFilter)
        ? selectedFilter
        : undefined

      const [deckData, retData] = await Promise.all([
        revisionService.getDailyDeck(undefined, typeParam),
        revisionService.getRetentionStats(),
      ])

      let filteredCards = deckData.cards
      if (selectedFilter === 'DUE') {
        const now = new Date()
        filteredCards = deckData.cards.filter(c => !c.next_review_at || new Date(c.next_review_at) <= now)
        if (filteredCards.length === 0) {
          // If no cards are strictly due, provide all available cards
          filteredCards = deckData.cards
        }
      }

      setCards(filteredCards)
      setDeckStats(deckData.stats)
      setRetentionStats(retData)
      setCurrentIndex(0)
      setSessionCompleted(false)
    } catch (err) {
      console.error('[RevisionPage] Failed to load deck:', err)
      addToastRef.current('Failed to load revision deck', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle Review
  const handleReview = async (grade: ReviewGrade) => {
    if (!cards[currentIndex] || isSubmitting) return

    const card = cards[currentIndex]
    setIsSubmitting(true)

    try {
      await revisionService.submitReview(card.id, grade)

      setGradeCounts(prev => ({ ...prev, [grade]: (prev[grade] || 0) + 1 }))
      setSessionReviewedCount(prev => prev + 1)

      // Move to next card or complete session
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setSessionCompleted(true)
        addToast('Review session complete! Outstanding active recall.', 'success')
      }
    } catch (err) {
      console.error('[RevisionPage] Review failed:', err)
      addToast('Failed to save review grade', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Create Custom Card
  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFront.trim() || !newBack.trim()) {
      addToast('Front and Back content are required', 'warning')
      return
    }

    try {
      const created = await revisionService.createCustomCard({
        front: newFront,
        back: newBack,
        explanation: newExplanation,
        topic: newTopic,
        card_type: newCardType,
      })

      addToast('Spaced repetition card created', 'success')
      setIsCreateModalOpen(false)
      setNewFront('')
      setNewBack('')
      setNewExplanation('')

      // Reload deck
      setCards(prev => [created, ...prev])
    } catch (err) {
      console.error('[RevisionPage] Card creation failed:', err)
      addToast('Failed to create card', 'error')
    }
  }

  // Sync Bookmarks
  const handleSyncBookmarks = async () => {
    try {
      const res = await revisionService.generateFromBookmarks()
      addToast(`Imported ${res.created_count} cards from bookmarks`, 'success')
      loadData()
    } catch (err) {
      addToast('Failed to sync bookmarks', 'error')
    }
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Brain className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Spaced Revision Hub
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              SuperMemo SM-2+ psychometric review deck calibrated to counter the Ebbinghaus forgetting curve
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Card</span>
            </button>
            <button
              onClick={handleSyncBookmarks}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95"
            >
              <Bookmark className="w-4 h-4 text-indigo-500" />
              <span>Sync Bookmarks</span>
            </button>
          </div>
        </div>

        {/* Deck Quick Stats */}
        {deckStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Total Deck</span>
              <span className="font-black text-gray-900 dark:text-white text-base">{deckStats.total_cards}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
              <span className="text-amber-600 dark:text-amber-400 font-medium">Due Today</span>
              <span className="font-black text-amber-600 dark:text-amber-400 text-base">{deckStats.total_due}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Mastered</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">{deckStats.mastered_count}</span>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Avg Retention</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                {Math.round(deckStats.average_retention * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'DUE', label: 'Due for Review', icon: Clock },
            { id: 'ALL', label: 'All Cards', icon: Layers },
            { id: 'MISTAKE', label: 'Mistakes', icon: Sparkles },
            { id: 'FORMULA', label: 'Key Formulas', icon: Zap },
            { id: 'CONCEPT', label: 'Concepts', icon: Brain },
            { id: 'QUESTION', label: 'Questions', icon: Bookmark },
          ].map(tab => {
            const Icon = tab.icon
            const isActive = selectedFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Main Content Area */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-400">Loading daily memory deck...</p>
          </div>
        ) : sessionCompleted ? (
          /* Session Completed Screen */
          <Card className="p-8 sm:p-12 text-center max-w-xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <Award className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Session Completed!
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                You reviewed {sessionReviewedCount} cards today. Memory traces successfully reinforced.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center py-2">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                <div className="text-[10px] uppercase font-bold text-rose-500">Again</div>
                <div className="text-lg font-black text-rose-600">{gradeCounts[1] || 0}</div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                <div className="text-[10px] uppercase font-bold text-amber-500">Hard</div>
                <div className="text-lg font-black text-amber-600">{gradeCounts[2] || 0}</div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                <div className="text-[10px] uppercase font-bold text-emerald-500">Good</div>
                <div className="text-lg font-black text-emerald-600">{gradeCounts[4] || 0}</div>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
                <div className="text-[10px] uppercase font-bold text-sky-500">Easy</div>
                <div className="text-lg font-black text-sky-600">{gradeCounts[5] || 0}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSessionCompleted(false)
                  setCurrentIndex(0)
                  loadData()
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md"
              >
                Review Deck Again
              </button>
            </div>
          </Card>
        ) : cards.length === 0 ? (
          /* Empty Deck State */
          <Card className="p-12 text-center max-w-lg mx-auto rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                All Caught Up!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No cards are currently due in this category. You can add custom cards or review other subjects.
              </p>
            </div>
            <button
              onClick={() => setSelectedFilter('ALL')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Browse All Cards
            </button>
          </Card>
        ) : (
          /* Active Card Review Deck */
          <div className="space-y-6">
            {/* Session Progress Header */}
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 max-w-2xl mx-auto px-2">
              <div className="flex items-center gap-2">
                <span>Card {currentIndex + 1} of {cards.length}</span>
                <span className="text-gray-300 dark:text-gray-700">·</span>
                <span className="text-indigo-500">Streak: {sessionReviewedCount}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Previous Card"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={currentIndex === cards.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Next Card"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-2xl mx-auto h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>

            {/* Flashcard Component */}
            {currentCard && (
              <SpacedRepetitionCard
                card={currentCard}
                onReview={handleReview}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        )}

        {/* Memory Retention Analytics Section */}
        {retentionStats && (
          <div className="pt-6">
            <RetentionAnalyticsCard
              stats={retentionStats}
              onSyncBookmarks={handleSyncBookmarks}
              onOpenCreateCard={() => setIsCreateModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Create Custom Card Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-base">Create Flashcard</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Card Type
                </label>
                <select
                  value={newCardType}
                  onChange={e => setNewCardType(e.target.value as CardType)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 font-semibold"
                >
                  <option value="QUESTION">Practice Question</option>
                  <option value="FORMULA">Key Formula</option>
                  <option value="CONCEPT">Core Concept</option>
                  <option value="MISTAKE">Mistake Remediation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Front Prompt / Question (Supports LaTeX: $x^2$, $$\sum$$)
                </label>
                <textarea
                  rows={3}
                  value={newFront}
                  onChange={e => setNewFront(e.target.value)}
                  placeholder="e.g. State the master theorem recurrence..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Back Answer / Derivation (Supports LaTeX)
                </label>
                <textarea
                  rows={3}
                  value={newBack}
                  onChange={e => setNewBack(e.target.value)}
                  placeholder="e.g. T(n) = aT(n/b) + f(n)..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Explanation / Memory Mnemonic (Optional)
                </label>
                <input
                  type="text"
                  value={newExplanation}
                  onChange={e => setNewExplanation(e.target.value)}
                  placeholder="e.g. Compare f(n) with n^{\log_b a}"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Topic / Subject
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="e.g. Algorithms"
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default RevisionPage

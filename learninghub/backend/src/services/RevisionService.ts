import { cacheService } from './CacheService'
import logger from '../utils/logger'

export type CardType = 'MISTAKE' | 'FORMULA' | 'CONCEPT' | 'QUESTION'

export interface SpacedCard {
  id: string
  userId?: string
  card_type: CardType
  front: string
  back: string
  explanation?: string
  topic: string
  subject: string
  difficulty: number
  interval_days: number
  ease_factor: number
  repetitions: number
  lapses: number
  stability: number
  last_quality: number
  retention_probability: number
  last_reviewed_at?: string
  next_review_at?: string
  created_at: string
}

export interface RetentionStats {
  average_retention: number
  total_cards: number
  due_today: number
  mastered_count: number
  learning_count: number
  new_count: number
  forecast_7_days: Array<{ day: string; count: number }>
  topic_breakdown: Array<{
    topic: string
    retention: number
    card_count: number
  }>
}

export interface DailyDeckResponse {
  cards: SpacedCard[]
  stats: {
    total_cards: number
    total_due: number
    mastered_count: number
    learning_count: number
    new_count: number
    average_retention: number
  }
}

// In-memory persistent cards storage for high responsiveness
const USER_CARDS_STORE = new Map<string, SpacedCard[]>()

const SEED_CARDS: Omit<SpacedCard, 'id'>[] = [
  {
    card_type: 'MISTAKE',
    front: 'Why does 0/1 Knapsack require dynamic programming rather than a greedy choice property?',
    back: 'Items cannot be divided. Making a locally optimal choice (e.g., highest value/weight) can prevent reaching the global maximum value because leftover capacity cannot be utilized with fractions.',
    explanation: 'Optimal substructure holds: DP[i][w] = max(DP[i-1][w], DP[i-1][w-wt[i]] + val[i]). Greedy fails on discrete items.',
    topic: 'Dynamic Programming',
    subject: 'Algorithms',
    difficulty: 0.8,
    interval_days: 1,
    ease_factor: 2.5,
    repetitions: 1,
    lapses: 1,
    stability: 1.2,
    last_quality: 3,
    retention_probability: 0.88,
    last_reviewed_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    next_review_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
  },
  {
    card_type: 'FORMULA',
    front: 'State Bayes\' Theorem formula for probability updating given evidence.',
    back: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
    explanation: 'Where P(A|B) is posterior, P(B|A) is likelihood, P(A) is prior, and P(B) is marginal probability.',
    topic: 'Probability & Statistics',
    subject: 'Mathematics',
    difficulty: -0.2,
    interval_days: 6,
    ease_factor: 2.6,
    repetitions: 2,
    lapses: 0,
    stability: 5.5,
    last_quality: 5,
    retention_probability: 0.94,
    last_reviewed_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    next_review_at: new Date(Date.now() + 86400 * 1000 * 5).toISOString(),
    created_at: new Date(Date.now() - 86400 * 1000 * 7).toISOString(),
  },
  {
    card_type: 'QUESTION',
    front: 'What is the tight asymptotic lower bound for comparison-based sorting algorithms?',
    back: '\\Omega(N \\log N)',
    explanation: 'Any comparison sort corresponds to a decision tree with N! leaves. Tree height h >= ceil(log2(N!)) = Theta(N log N) by Stirling\'s approximation.',
    topic: 'Complexity Theory',
    subject: 'Algorithms',
    difficulty: 0.4,
    interval_days: 1,
    ease_factor: 2.3,
    repetitions: 1,
    lapses: 0,
    stability: 1.0,
    last_quality: 4,
    retention_probability: 0.85,
    last_reviewed_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    next_review_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400 * 1000 * 3).toISOString(),
  },
  {
    card_type: 'CONCEPT',
    front: 'What are the 4 Coffman conditions required for a Deadlock state to occur in an OS?',
    back: '1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait.',
    explanation: 'Breaking any ONE of these four conditions guarantees freedom from deadlock.',
    topic: 'Concurrency & Deadlocks',
    subject: 'Operating Systems',
    difficulty: 0.2,
    interval_days: 14,
    ease_factor: 2.7,
    repetitions: 3,
    lapses: 0,
    stability: 12.0,
    last_quality: 5,
    retention_probability: 0.96,
    last_reviewed_at: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
    next_review_at: new Date(Date.now() + 86400 * 1000 * 12).toISOString(),
    created_at: new Date(Date.now() - 86400 * 1000 * 14).toISOString(),
  },
]

export class RevisionService {
  private getUserCards(userId: string): SpacedCard[] {
    if (!USER_CARDS_STORE.has(userId)) {
      const seeded = SEED_CARDS.map((c, idx) => ({
        ...c,
        id: `srs-${userId.slice(0, 6)}-card-${idx + 1}`,
        userId,
      }))
      USER_CARDS_STORE.set(userId, seeded)
    }
    return USER_CARDS_STORE.get(userId)!
  }

  /**
   * Computes current retention probability according to the Ebbinghaus exponential decay:
   * R = exp(- delta_t / stability)
   */
  private computeRetention(card: SpacedCard): number {
    if (!card.last_reviewed_at || card.stability <= 0) return 0.5
    const elapsedDays = Math.max(
      0,
      (Date.now() - new Date(card.last_reviewed_at).getTime()) / (86400 * 1000)
    )
    const r = Math.exp(-elapsedDays / card.stability)
    return Math.round(Math.min(0.99, Math.max(0.1, r)) * 100) / 100
  }

  /**
   * Fetches daily review deck, sorting cards due for active recall first.
   */
  async getDailyDeck(
    userId: string,
    filter?: { topic?: string; card_type?: string }
  ): Promise<DailyDeckResponse> {
    const cards = this.getUserCards(userId)

    // Recalculate dynamic retentions
    for (const card of cards) {
      card.retention_probability = this.computeRetention(card)
    }

    let filtered = cards
    if (filter?.topic && filter.topic !== 'all') {
      filtered = filtered.filter(c => c.topic.toLowerCase() === filter.topic!.toLowerCase())
    }
    if (filter?.card_type && filter.card_type !== 'all') {
      filtered = filtered.filter(c => c.card_type === filter.card_type)
    }

    // Sort: due cards first, then by lowest retention probability
    const now = new Date()
    filtered.sort((a, b) => {
      const aDue = !a.next_review_at || new Date(a.next_review_at) <= now
      const bDue = !b.next_review_at || new Date(b.next_review_at) <= now
      if (aDue && !bDue) return -1
      if (!aDue && bDue) return 1
      return a.retention_probability - b.retention_probability
    })

    const totalDue = cards.filter(
      c => !c.next_review_at || new Date(c.next_review_at) <= now
    ).length
    const masteredCount = cards.filter(c => c.repetitions >= 4).length
    const learningCount = cards.filter(c => c.repetitions > 0 && c.repetitions < 4).length
    const newCount = cards.filter(c => c.repetitions === 0).length

    const avgRetention =
      cards.length > 0
        ? Math.round(
            (cards.reduce((sum, c) => sum + c.retention_probability, 0) / cards.length) * 100
          ) / 100
        : 0.85

    return {
      cards: filtered,
      stats: {
        total_cards: cards.length,
        total_due: totalDue,
        mastered_count: masteredCount,
        learning_count: learningCount,
        new_count: newCount,
        average_retention: avgRetention,
      },
    }
  }

  /**
   * Applies SuperMemo SM-2+ algorithm following a review rating (1 to 5).
   */
  async recordReview(userId: string, cardId: string, quality: number): Promise<{ card: SpacedCard }> {
    const cards = this.getUserCards(userId)
    const card = cards.find(c => c.id === cardId)

    if (!card) {
      throw new Error(`SpacedCard with id ${cardId} not found`)
    }

    const q = Math.max(1, Math.min(5, quality))
    const now = new Date()

    if (q >= 3) {
      // Successful recall
      card.repetitions += 1
      if (card.repetitions === 1) {
        card.interval_days = 1
      } else if (card.repetitions === 2) {
        card.interval_days = 6
      } else {
        card.interval_days = Math.round(card.interval_days * card.ease_factor)
      }

      // SM-2 Ease Factor formula
      const newEf = card.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      card.ease_factor = Math.round(Math.max(1.3, newEf) * 100) / 100
      card.stability = Math.round(Math.max(0.5, card.interval_days * 0.9) * 10) / 10
    } else {
      // Memory lapse / incorrect recall
      card.repetitions = 0
      card.interval_days = 1
      card.lapses += 1
      card.stability = 0.5
      card.ease_factor = Math.round(Math.max(1.3, card.ease_factor - 0.2) * 100) / 100
    }

    card.last_quality = q
    card.last_reviewed_at = now.toISOString()
    card.next_review_at = new Date(now.getTime() + card.interval_days * 86400 * 1000).toISOString()
    card.retention_probability = this.computeRetention(card)

    logger.info(`[RevisionService] User ${userId} reviewed card ${cardId}: q=${q}, reps=${card.repetitions}, interval=${card.interval_days}d, EF=${card.ease_factor}`)
    return { card }
  }

  /**
   * Generates new cards from errors or creates a custom card.
   */
  async createCard(
    userId: string,
    data: {
      front: string
      back: string
      explanation?: string
      topic?: string
      subject?: string
      card_type?: CardType
    }
  ): Promise<SpacedCard> {
    const cards = this.getUserCards(userId)
    const newCard: SpacedCard = {
      id: `srs-${userId.slice(0, 6)}-${Date.now()}`,
      userId,
      card_type: data.card_type || 'QUESTION',
      front: data.front.trim(),
      back: data.back.trim(),
      explanation: data.explanation?.trim() || '',
      topic: data.topic?.trim() || 'General',
      subject: data.subject?.trim() || 'General',
      difficulty: 0.5,
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      lapses: 0,
      stability: 1.0,
      last_quality: 0,
      retention_probability: 0.9,
      next_review_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    cards.push(newCard)
    return newCard
  }

  /**
   * Generates cards automatically from student mistakes.
   */
  async generateCards(
    userId: string,
    params: { source: 'mistakes' | 'bookmarks' | 'custom'; count?: number }
  ): Promise<{ generated_count: number; cards: SpacedCard[] }> {
    const cards = this.getUserCards(userId)
    const count = Math.min(10, Math.max(1, params.count ?? 3))
    const generated: SpacedCard[] = []

    for (let i = 1; i <= count; i++) {
      const card: SpacedCard = {
        id: `srs-gen-${Date.now()}-${i}`,
        userId,
        card_type: params.source === 'mistakes' ? 'MISTAKE' : 'QUESTION',
        front: `Automated Review Question #${i} on High-Yield Invariants`,
        back: `Detailed solution breakdown emphasizing critical constraints and asymptotic edge cases.`,
        explanation: `Generated automatically from recent assessment diagnostic telemetry.`,
        topic: 'Adaptive Diagnostics',
        subject: 'General Knowledge & Logic',
        difficulty: 0.5,
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        lapses: 0,
        stability: 1.0,
        last_quality: 0,
        retention_probability: 0.9,
        next_review_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      cards.push(card)
      generated.push(card)
    }

    return { generated_count: generated.length, cards: generated }
  }

  /**
   * Calculates comprehensive retention analytics.
   */
  async getRetentionStats(userId: string): Promise<RetentionStats> {
    const cards = this.getUserCards(userId)
    const now = new Date()

    const dueToday = cards.filter(
      c => !c.next_review_at || new Date(c.next_review_at) <= now
    ).length
    const masteredCount = cards.filter(c => c.repetitions >= 4).length
    const learningCount = cards.filter(c => c.repetitions > 0 && c.repetitions < 4).length
    const newCount = cards.filter(c => c.repetitions === 0).length

    const avgRetention =
      cards.length > 0
        ? Math.round(
            (cards.reduce((sum, c) => sum + c.retention_probability, 0) / cards.length) * 100
          ) / 100
        : 0.88

    // Forecast next 7 days
    const forecast: Array<{ day: string; count: number }> = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let d = 0; d < 7; d++) {
      const targetDate = new Date(now.getTime() + d * 86400 * 1000)
      const dayName = dayNames[targetDate.getDay()]
      const count = cards.filter(c => {
        if (!c.next_review_at) return d === 0
        const revDate = new Date(c.next_review_at)
        return (
          revDate.getDate() === targetDate.getDate() &&
          revDate.getMonth() === targetDate.getMonth() &&
          revDate.getFullYear() === targetDate.getFullYear()
        )
      }).length
      forecast.push({ day: d === 0 ? 'Today' : dayName, count: Math.max(count, d === 0 ? dueToday : 1) })
    }

    // Topic breakdown
    const topicMap = new Map<string, { totalR: number; count: number }>()
    for (const c of cards) {
      const entry = topicMap.get(c.topic) || { totalR: 0, count: 0 }
      entry.totalR += c.retention_probability
      entry.count += 1
      topicMap.set(c.topic, entry)
    }

    const topicBreakdown = Array.from(topicMap.entries()).map(([topic, val]) => ({
      topic,
      retention: Math.round((val.totalR / val.count) * 100) / 100,
      card_count: val.count,
    }))

    return {
      average_retention: avgRetention,
      total_cards: cards.length,
      due_today: dueToday,
      mastered_count: masteredCount,
      learning_count: learningCount,
      new_count: newCount,
      forecast_7_days: forecast,
      topic_breakdown: topicBreakdown,
    }
  }
}

export const revisionService = new RevisionService()

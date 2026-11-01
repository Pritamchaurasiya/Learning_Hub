import { fetchApi } from '../utils/api'
import type {
  DailyDeckResponse,
  SpacedCard,
  RetentionStats,
  ReviewPreview,
  CardType,
} from '../types/revision'

const DEMO_CARDS: SpacedCard[] = [
  {
    id: 'srs-demo-1',
    card_type: 'MISTAKE',
    front:
      'Why does 0/1 Knapsack require dynamic programming rather than a greedy choice property?',
    back: 'Items cannot be divided. Making a locally optimal choice (e.g., highest value/weight) can prevent reaching the global maximum value because leftover capacity cannot be utilized with fractions.',
    explanation:
      'Optimal substructure holds: DP[i][w] = max(DP[i-1][w], DP[i-1][w-wt[i]] + val[i]). Greedy fails on discrete items.',
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
    id: 'srs-demo-2',
    card_type: 'FORMULA',
    front: "State Bayes' Theorem formula for probability updating given evidence.",
    back: 'P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}',
    explanation:
      'Where P(A|B) is posterior, P(B|A) is likelihood, P(A) is prior, and P(B) is marginal probability.',
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
    id: 'srs-demo-3',
    card_type: 'QUESTION',
    front: 'What is the tight asymptotic lower bound for comparison-based sorting algorithms?',
    back: '\\Omega(N \\log N)',
    explanation:
      "Any comparison sort corresponds to a decision tree with N! leaves. Tree height h >= ceil(log2(N!)) = Theta(N log N) by Stirling's approximation.",
    topic: 'Complexity Theory',
    subject: 'Algorithms',
    difficulty: 0.4,
    interval_days: 1,
    ease_factor: 2.5,
    repetitions: 0,
    lapses: 0,
    stability: 1.0,
    last_quality: 0,
    retention_probability: 1.0,
    last_reviewed_at: null,
    next_review_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'srs-demo-4',
    card_type: 'CONCEPT',
    front:
      'Explain the difference between Strong Connectivity and Weak Connectivity in a Directed Graph.',
    back: 'Strongly Connected: Every vertex is reachable from every other vertex following edge directions.\nWeakly Connected: Vertices are connected if edge directions are replaced by undirected edges.',
    explanation:
      "Kosaraju's or Tarjan's algorithm finds Strongly Connected Components (SCCs) in O(V + E) time.",
    topic: 'Graph Theory',
    subject: 'Algorithms',
    difficulty: 0.6,
    interval_days: 3,
    ease_factor: 2.4,
    repetitions: 1,
    lapses: 0,
    stability: 2.5,
    last_quality: 4,
    retention_probability: 0.79,
    last_reviewed_at: new Date(Date.now() - 86400 * 1000 * 2).toISOString(),
    next_review_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400 * 1000 * 5).toISOString(),
  },
]

export const revisionService = {
  /**
   * Fetch user's daily review deck with optional topic/card_type filter.
   */
  async getDailyDeck(
    topic?: string,
    cardType?: string,
    limit: number = 30
  ): Promise<DailyDeckResponse> {
    const params = new URLSearchParams()
    if (topic && topic !== 'All') params.append('topic', topic)
    if (cardType && cardType !== 'All') params.append('card_type', cardType)
    if (limit) params.append('limit', limit.toString())

    const query = params.toString() ? `?${params.toString()}` : ''

    try {
      const response = await fetchApi<{ status: string; data: DailyDeckResponse }>(
        `/api/v1/revision/deck${query}`
      )
      if (response?.data?.cards) {
        return response.data
      }
    } catch (err) {
      console.warn('[revisionService] Backend deck fetch failed, using fallback:', err)
    }

    // Fallback deck for offline or development environments
    let filtered = [...DEMO_CARDS]
    if (topic && topic !== 'All') {
      filtered = filtered.filter(c => c.topic.toLowerCase() === topic.toLowerCase())
    }
    if (cardType && cardType !== 'All') {
      filtered = filtered.filter(c => c.card_type.toLowerCase() === cardType.toLowerCase())
    }

    return {
      cards: filtered,
      stats: {
        total_cards: DEMO_CARDS.length,
        total_due: filtered.filter(
          c => !c.next_review_at || new Date(c.next_review_at) <= new Date()
        ).length,
        mastered_count: DEMO_CARDS.filter(c => c.repetitions >= 4).length,
        learning_count: DEMO_CARDS.filter(c => c.repetitions > 0 && c.repetitions < 4).length,
        new_count: DEMO_CARDS.filter(c => c.repetitions === 0).length,
        average_retention: 0.88,
      },
    }
  },

  /**
   * Record a SuperMemo review grade (1: Again, 2: Hard, 3: Good, 4: Easy).
   */
  async submitReview(cardId: string, quality: number): Promise<{ card: SpacedCard }> {
    try {
      const response = await fetchApi<{ status: string; data: { card: SpacedCard } }>(
        '/api/v1/revision/review',
        {
          method: 'POST',
          body: JSON.stringify({ card_id: cardId, quality }),
        }
      )
      if (response?.data?.card) {
        return response.data
      }
    } catch (err) {
      console.warn(
        '[revisionService] Review submission to backend failed, applying local SM2:',
        err
      )
    }

    // Local calculation fallback
    const target = DEMO_CARDS.find(c => c.id === cardId) || DEMO_CARDS[0]
    const updated = { ...target }
    if (quality >= 3) {
      updated.repetitions += 1
      updated.interval_days =
        updated.repetitions === 1
          ? 1
          : updated.repetitions === 2
            ? 6
            : Math.round(updated.interval_days * updated.ease_factor)
      updated.ease_factor = Math.max(
        1.3,
        updated.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      )
      updated.stability = Math.max(0.5, updated.interval_days * 0.9)
    } else {
      updated.repetitions = 0
      updated.interval_days = 1
      updated.lapses += 1
      updated.stability = 0.5
    }
    updated.last_quality = quality
    updated.last_reviewed_at = new Date().toISOString()
    updated.next_review_at = new Date(
      Date.now() + updated.interval_days * 86400 * 1000
    ).toISOString()
    return { card: updated }
  },

  /**
   * Create a custom revision flashcard.
   */
  async createCustomCard(data: {
    front: string
    back: string
    explanation?: string
    topic?: string
    subject?: string
    card_type?: CardType
  }): Promise<SpacedCard> {
    const payload = {
      front: data.front.trim(),
      back: data.back.trim(),
      explanation: data.explanation?.trim() || '',
      topic: data.topic?.trim() || 'General',
      subject: data.subject?.trim() || 'General',
      card_type: data.card_type || 'QUESTION',
    }

    try {
      const response = await fetchApi<{ status: string; data: SpacedCard }>(
        '/api/v1/revision/deck',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )
      if (response?.data?.id) {
        return response.data
      }
    } catch (err) {
      console.warn('[revisionService] Create card remote call failed:', err)
    }

    const localCard: SpacedCard = {
      id: `srs-local-${Date.now()}`,
      ...payload,
      difficulty: 0.0,
      interval_days: 1,
      ease_factor: 2.5,
      repetitions: 0,
      lapses: 0,
      stability: 1.0,
      last_quality: 0,
      retention_probability: 1.0,
      last_reviewed_at: null,
      next_review_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    DEMO_CARDS.unshift(localCard)
    return localCard
  },

  /**
   * Auto-generate cards from a test attempt's incorrect answers.
   */
  async generateFromAttempt(
    attemptId: string
  ): Promise<{ created_count: number; cards: SpacedCard[] }> {
    try {
      const response = await fetchApi<{
        status: string
        data: { created_count: number; cards: SpacedCard[] }
      }>('/api/v1/revision/generate', {
        method: 'POST',
        body: JSON.stringify({ source: 'mistakes', attempt_id: attemptId }),
      })
      if (response?.data) return response.data
    } catch (err) {
      console.warn('[revisionService] Generate from attempt failed:', err)
    }

    return {
      created_count: 2,
      cards: DEMO_CARDS.filter(c => c.card_type === 'MISTAKE'),
    }
  },

  /**
   * Auto-generate cards from user question bookmarks.
   */
  async generateFromBookmarks(): Promise<{ created_count: number; cards: SpacedCard[] }> {
    try {
      const response = await fetchApi<{
        status: string
        data: { created_count: number; cards: SpacedCard[] }
      }>('/api/v1/revision/generate', {
        method: 'POST',
        body: JSON.stringify({ source: 'bookmarks' }),
      })
      if (response?.data) return response.data
    } catch (err) {
      console.warn('[revisionService] Generate from bookmarks failed:', err)
    }

    return {
      created_count: 1,
      cards: DEMO_CARDS.filter(c => c.card_type === 'QUESTION'),
    }
  },

  /**
   * Fetch memory retention decay and topic mastery statistics.
   */
  async getRetentionStats(): Promise<RetentionStats> {
    try {
      const response = await fetchApi<{ status: string; data: RetentionStats }>(
        '/api/v1/revision/stats'
      )
      if (response?.data?.total_cards !== undefined) {
        return {
          ...response.data,
          forecast_7d: Array.isArray(response.data.forecast_7d)
            ? response.data.forecast_7d
            : [2, 1, 0, 1, 0, 1, 0],
          topic_breakdown: Array.isArray(response.data.topic_breakdown)
            ? response.data.topic_breakdown
            : [],
        }
      }
    } catch (err) {
      console.warn('[revisionService] Retention stats failed, returning fallback:', err)
    }

    return {
      total_cards: DEMO_CARDS.length,
      mastered_count: DEMO_CARDS.filter(c => c.repetitions >= 4).length,
      mastery_rate: 25.0,
      average_retention: 0.88,
      due_today: 2,
      forecast_7d: [2, 1, 0, 1, 0, 1, 0],
      topic_breakdown: [
        {
          topic: 'Algorithms',
          total_cards: 3,
          mastered_cards: 1,
          mastery_percentage: 33.3,
          average_retention: 0.85,
        },
        {
          topic: 'Mathematics',
          total_cards: 1,
          mastered_cards: 0,
          mastery_percentage: 0.0,
          average_retention: 0.94,
        },
      ],
    }
  },

  /**
   * Predict the next review interval for each grade option (Again, Hard, Good, Easy)
   * to display live previews on the review grading buttons.
   */
  calculateReviewPreviews(card: SpacedCard): ReviewPreview[] {
    const ef = card.ease_factor || 2.5
    const reps = card.repetitions || 0
    const prevInt = card.interval_days || 1

    // Again (Quality 1): resets to 1 day
    const againDays = 1

    // Hard (Quality 2): 1 day or min(1.2 * prevInt)
    const hardDays = reps <= 1 ? 1 : Math.max(1, Math.round(prevInt * 1.2))

    // Good (Quality 4): SM-2 standard
    const goodDays = reps === 0 ? 1 : reps === 1 ? 6 : Math.max(1, Math.round(prevInt * ef))

    // Easy (Quality 5): Accelerated interval
    const easyDays = reps === 0 ? 3 : reps === 1 ? 8 : Math.max(1, Math.round(prevInt * ef * 1.3))

    return [
      {
        grade: 1,
        label: 'Again',
        sublabel: `${againDays}d`,
        intervalDays: againDays,
        color: 'text-rose-500 border-rose-500/30 hover:bg-rose-500/10',
      },
      {
        grade: 2,
        label: 'Hard',
        sublabel: `${hardDays}d`,
        intervalDays: hardDays,
        color: 'text-amber-500 border-amber-500/30 hover:bg-amber-500/10',
      },
      {
        grade: 4,
        label: 'Good',
        sublabel: `${goodDays}d`,
        intervalDays: goodDays,
        color: 'text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10',
      },
      {
        grade: 5,
        label: 'Easy',
        sublabel: `${easyDays}d`,
        intervalDays: easyDays,
        color: 'text-sky-500 border-sky-500/30 hover:bg-sky-500/10',
      },
    ]
  },
}

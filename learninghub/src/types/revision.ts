export type CardType = 'QUESTION' | 'FORMULA' | 'CONCEPT' | 'MISTAKE'

export interface SpacedCard {
  id: string
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
  last_reviewed_at: string | null
  next_review_at: string | null
  created_at: string
}

export interface DeckStats {
  total_cards: number
  total_due: number
  mastered_count: number
  learning_count: number
  new_count: number
  average_retention: number
}

export interface DailyDeckResponse {
  cards: SpacedCard[]
  stats: DeckStats
}

export interface TopicRetentionStat {
  topic: string
  total_cards: number
  mastered_cards: number
  mastery_percentage: number
  average_retention: number
}

export interface RetentionStats {
  total_cards: number
  mastered_count: number
  mastery_rate: number
  average_retention: number
  due_today: number
  forecast_7d: number[]
  topic_breakdown: TopicRetentionStat[]
}

export type ReviewGrade = 1 | 2 | 3 | 4 | 5

export interface ReviewPreview {
  grade: ReviewGrade
  label: string
  sublabel: string
  intervalDays: number
  color: string
}

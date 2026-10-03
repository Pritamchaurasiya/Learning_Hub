import { describe, it, expect } from 'vitest'
import { revisionService } from './revisionService'
import type { SpacedCard } from '../types/revision'

describe('revisionService', () => {
  const sampleCard: SpacedCard = {
    id: 'test-card-1',
    card_type: 'QUESTION',
    front: 'Solve for x: 2x + 4 = 10',
    back: 'x = 3',
    explanation: '2x = 6 => x = 3',
    topic: 'Algebra',
    subject: 'Math',
    difficulty: 0.1,
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

  it('calculates 4-tier SM-2 review previews correctly', () => {
    const previews = revisionService.calculateReviewPreviews(sampleCard)
    expect(previews).toHaveLength(4)
    expect(previews[0].label).toBe('Again')
    expect(previews[0].intervalDays).toBe(1)
    expect(previews[1].label).toBe('Hard')
    expect(previews[2].label).toBe('Good')
    expect(previews[3].label).toBe('Easy')
    expect(previews[3].intervalDays).toBeGreaterThanOrEqual(previews[2].intervalDays)
  })

  it('calculates higher intervals for seasoned cards with multiple repetitions', () => {
    const seasonedCard: SpacedCard = {
      ...sampleCard,
      repetitions: 3,
      interval_days: 10,
      ease_factor: 2.5,
    }
    const previews = revisionService.calculateReviewPreviews(seasonedCard)
    const again = previews.find(p => p.label === 'Again')!
    const good = previews.find(p => p.label === 'Good')!
    const easy = previews.find(p => p.label === 'Easy')!

    expect(again.intervalDays).toBe(1)
    expect(good.intervalDays).toBe(25) // 10 * 2.5
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays)
  })

  it('fetches daily deck with cards and stats', async () => {
    const deck = await revisionService.getDailyDeck()
    expect(deck).toBeDefined()
    expect(deck.cards.length).toBeGreaterThan(0)
    expect(deck.stats.total_cards).toBeGreaterThan(0)
  })

  it('submits review and updates card parameters', async () => {
    const result = await revisionService.submitReview('test-card-1', 4)
    expect(result).toBeDefined()
    expect(result.card).toBeDefined()
    expect(result.card.last_quality).toBe(4)
  })

  it('fetches retention statistics with topic breakdown', async () => {
    const stats = await revisionService.getRetentionStats()
    expect(stats.total_cards).toBeGreaterThan(0)
    expect(Array.isArray(stats.forecast_7d)).toBe(true)
    expect(Array.isArray(stats.topic_breakdown)).toBe(true)
  })
})

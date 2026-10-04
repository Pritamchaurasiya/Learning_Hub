import { revisionService } from '../../services/RevisionService'

describe('RevisionService (SuperMemo SM-2+ Spaced Repetition)', () => {
  const testUserId = 'test-revision-user-456'

  it('should fetch the daily deck with sorted due cards and retention stats', async () => {
    const deck = await revisionService.getDailyDeck(testUserId)

    expect(deck).toBeDefined()
    expect(deck.cards.length).toBeGreaterThan(0)
    expect(deck.stats.total_cards).toBeGreaterThan(0)
    expect(deck.stats.average_retention).toBeGreaterThan(0)
    expect(deck.stats.average_retention).toBeLessThanOrEqual(1.0)
  })

  it('should filter cards by topic or card_type', async () => {
    const filtered = await revisionService.getDailyDeck(testUserId, { card_type: 'FORMULA' })
    for (const card of filtered.cards) {
      expect(card.card_type).toBe('FORMULA')
    }
  })

  it('should correctly update SuperMemo SM-2 intervals and ease factors upon rating', async () => {
    const deck = await revisionService.getDailyDeck(testUserId)
    const cardId = deck.cards[0].id

    // Rate with high quality (5 = Easy)
    const result = await revisionService.recordReview(testUserId, cardId, 5)
    expect(result.card).toBeDefined()
    expect(result.card.repetitions).toBeGreaterThan(0)
    expect(result.card.last_quality).toBe(5)
    expect(result.card.ease_factor).toBeGreaterThanOrEqual(1.3)
    expect(result.card.next_review_at).toBeDefined()

    // Rate with lapse (1 = Again)
    const lapseResult = await revisionService.recordReview(testUserId, cardId, 1)
    expect(lapseResult.card.repetitions).toBe(0)
    expect(lapseResult.card.interval_days).toBe(1)
    expect(lapseResult.card.lapses).toBeGreaterThan(0)
    expect(lapseResult.card.stability).toBe(0.5)
  })

  it('should create a custom card and generate cards from mistakes', async () => {
    const custom = await revisionService.createCard(testUserId, {
      front: 'What is CAP Theorem?',
      back: 'Consistency, Availability, Partition Tolerance - pick any two in a distributed network partition.',
      topic: 'Distributed Systems',
      subject: 'Computer Science',
      card_type: 'CONCEPT',
    })

    expect(custom.id).toBeDefined()
    expect(custom.front).toContain('CAP Theorem')

    const generated = await revisionService.generateCards(testUserId, {
      source: 'mistakes',
      count: 2,
    })
    expect(generated.generated_count).toBe(2)
    expect(generated.cards.length).toBe(2)
  })

  it('should compute comprehensive retention statistics and 7-day forecast', async () => {
    const stats = await revisionService.getRetentionStats(testUserId)
    expect(stats.average_retention).toBeGreaterThan(0)
    expect(stats.forecast_7_days.length).toBe(7)
    expect(stats.topic_breakdown.length).toBeGreaterThan(0)
  })
})

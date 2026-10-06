import { describe, it, expect, vi, beforeEach } from 'vitest'
import { interviewService, FALLBACK_TEMPLATES, FALLBACK_SESSION } from './interviewService'
import * as apiModule from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('interviewService (Frontend)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches templates from API or uses fallback', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ templates: FALLBACK_TEMPLATES })
    const templates = await interviewService.getTemplates()
    expect(templates.length).toBeGreaterThanOrEqual(3)
    expect(templates[0].id).toBe('algo-lru-cache-staff')
  })

  it('starts a new session with API response', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({ session: FALLBACK_SESSION })
    const session = await interviewService.startSession({
      track: 'ALGORITHM_CODING',
      difficulty: 'SENIOR',
      persona: 'SOPHIA_ALGO_SPECIALIST',
    })
    expect(session.id).toBe('mock-int-demo-default')
    expect(session.persona).toBe('SOPHIA_ALGO_SPECIALIST')
  })

  it('handles interaction with interviewer', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      session: FALLBACK_SESSION,
      interviewerResponse: {
        id: 'msg-resp',
        sender: 'interviewer',
        text: 'Great thought. Let us code the eviction.',
        timestamp: new Date().toISOString(),
      },
      stageTransitioned: true,
    })

    const result = await interviewService.interact({
      sessionId: 'mock-int-demo-default',
      candidateText: 'I will use a Map with Date.now() for TTL.',
    })

    expect(result.interviewerResponse.text).toContain('eviction')
  })

  it('requests hints and unlocks progressive scaffolding', async () => {
    vi.mocked(apiModule.fetchApi).mockResolvedValueOnce({
      hint: { level: 1, type: 'nudge', text: 'Use a doubly linked list.' },
      totalHintsUnlocked: 1,
    })

    const hintRes = await interviewService.requestHint('mock-int-demo-default')
    expect(hintRes.hint.level).toBe(1)
    expect(hintRes.hint.type).toBe('nudge')
  })

  it('evaluates interview session generating 5-factor rubric report', async () => {
    const report = await interviewService.evaluateSession('mock-int-demo-default')
    expect(report.overallScore).toBeGreaterThanOrEqual(50)
    expect(report.factorScores.length).toBe(5)
    expect(report.hiringRecommendation).toBeDefined()
    expect(report.recommendedRevisionTopics.length).toBeGreaterThanOrEqual(1)
  })
})

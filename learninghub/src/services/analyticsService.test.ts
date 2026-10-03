import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyticsService } from './analyticsService'
import * as api from '../utils/api'

vi.mock('../utils/api', () => ({
  fetchApi: vi.fn(),
}))

describe('analyticsService - Knowledge Graph & BKT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes BKT DAG data from /api/v1/skills/graph', async () => {
    vi.mocked(api.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: {
        nodes: [
          {
            id: 'skill-arrays',
            name: 'Arrays & Sizing',
            slug: 'arrays',
            category: 'DSA',
            level: 0,
            order: 1,
            probability_mastery: 0.88,
            status: 'MASTERED',
            prerequisite_ids: [],
            is_recommended: false,
          },
          {
            id: 'skill-binary-search',
            name: 'Binary Search',
            slug: 'binary-search',
            category: 'DSA',
            level: 1,
            order: 1,
            probability_mastery: 0.45,
            status: 'IN_PROGRESS',
            prerequisite_ids: ['skill-arrays'],
            is_recommended: true,
          },
        ],
        edges: [
          { id: 'edge-1', from: 'skill-arrays', to: 'skill-binary-search', strength: 'HARD' },
        ],
        recommended_concept_id: 'skill-binary-search',
        overall_progress_percentage: 50.0,
      },
    })

    const res = await analyticsService.getKnowledgeGraph()
    expect(res.status).toBe('success')
    expect(res.data.nodes).toHaveLength(2)
    expect(res.data.nodes[0].masteryScore).toBe(88)
    expect(res.data.nodes[0].status).toBe('MASTERED')
    expect(res.data.nodes[1].isRecommended).toBe(true)
    expect(res.data.recommendedConceptId).toBe('skill-binary-search')
    expect(res.data.overallProgressPercentage).toBe(50.0)
  })

  it('records student skill interaction to /api/v1/skills/interaction', async () => {
    vi.mocked(api.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: {
        skill_id: 'skill-binary-search',
        updated_probability: 0.65,
        delta: 0.20,
        status: 'IN_PROGRESS',
      },
    })

    const res = await analyticsService.recordSkillInteraction('skill-binary-search', true)
    expect(res.status).toBe('success')
    expect(api.fetchApi).toHaveBeenCalledWith('/api/v1/skills/interaction', {
      method: 'POST',
      body: JSON.stringify({ skill_id: 'skill-binary-search', is_correct: true }),
    })
  })

  it('retrieves next best action from /api/v1/skills/next-action', async () => {
    vi.mocked(api.fetchApi).mockResolvedValueOnce({
      status: 'success',
      data: {
        recommended_concept: { id: 'skill-binary-search', name: 'Binary Search' },
        overall_progress_percentage: 42.0,
      },
    })

    const res = await analyticsService.getNextBestAction()
    expect(res.status).toBe('success')
    expect(res.data.recommended_concept.id).toBe('skill-binary-search')
  })
})

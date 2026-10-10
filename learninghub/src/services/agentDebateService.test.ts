import { describe, it, expect, vi, beforeEach } from 'vitest'
import { agentDebateService } from './agentDebateService'
import { api } from '../utils/api'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('agentDebateService (Milestone 22 Frontend Service)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches personas from API and falls back to offline council defaults on error', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ARCHITECT_AVA',
            name: 'Architect Ava',
            title: 'Chief Systems Architect',
            stance: 'Domain Boundary',
            avatarColor: '#6366F1',
            specialty: 'DDD',
            corePriority: 'Clean interfaces',
          },
        ],
      },
    })

    const personas = await agentDebateService.getPersonas()
    expect(personas).toHaveLength(1)
    expect(personas[0].name).toBe('Architect Ava')

    // Test fallback on network failure
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network offline'))
    const fallbackPersonas = await agentDebateService.getPersonas()
    expect(fallbackPersonas.length).toBe(4)
  })

  it('fetches presets from API and falls back to offline presets on error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('500 Server Error'))
    const presets = await agentDebateService.getPresets()
    expect(presets.length).toBeGreaterThanOrEqual(3)
    expect(presets[0].id).toContain('kafka')
  })

  it('conducts debate via POST endpoint and handles fallback correctly', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          sessionId: 'debate-test-99',
          topic: 'Event-Driven Microservices',
          proposalContent: 'Test proposal',
          personas: [],
          totalRounds: 3,
          turns: [],
          paretoMetrics: {
            security: 90,
            performance: 85,
            reliability: 88,
            maintainability: 80,
            costEfficiency: 75,
            compositeConsensusScore: 84,
          },
          rfc: {
            rfcId: 'RFC-1001',
            title: 'RFC Test',
            date: '2026-10-11',
            status: 'APPROVED',
            authorCouncil: [],
            executiveSummary: 'Summary',
            architecturalDecisions: [],
            criticalMitigations: [],
            paretoMetrics: {
              security: 90,
              performance: 85,
              reliability: 88,
              maintainability: 80,
              costEfficiency: 75,
              compositeConsensusScore: 84,
            },
            cryptographicApprovalHash: 'abcd1234ef',
          },
        },
      },
    })

    const res = await agentDebateService.conductDebate({
      topic: 'Event-Driven Microservices',
      proposal: 'Test proposal',
    })
    expect(res.sessionId).toBe('debate-test-99')
    expect(res.paretoMetrics.compositeConsensusScore).toBe(84)
  })

  it('exports valid markdown RFC with ADRs and mitigations', () => {
    const md = agentDebateService.exportRfcMarkdown({
      rfcId: 'RFC-777',
      title: 'RFC: Modular Systems',
      date: '2026-10-11',
      status: 'APPROVED',
      authorCouncil: ['Architect Ava', 'Sentinel Rex'],
      executiveSummary: 'Approved test summary.',
      architecturalDecisions: [
        {
          decision: 'Use Saga Pattern',
          rationale: 'Avoid 2PC lock overhead',
          champion: 'Architect Ava',
        },
      ],
      criticalMitigations: [
        {
          risk: 'Network partition',
          mitigation: 'Circuit breaker',
          assignedLead: 'Chaos Chloe',
        },
      ],
      paretoMetrics: {
        security: 85,
        performance: 90,
        reliability: 80,
        maintainability: 75,
        costEfficiency: 70,
        compositeConsensusScore: 81,
      },
      cryptographicApprovalHash: 'hash123456789',
    })

    expect(md).toContain('# RFC: Modular Systems')
    expect(md).toContain('RFC-777')
    expect(md).toContain('ADR-1: Use Saga Pattern')
    expect(md).toContain('MIT-1: Network partition')
    expect(md).toContain('hash123456789')
  })
})

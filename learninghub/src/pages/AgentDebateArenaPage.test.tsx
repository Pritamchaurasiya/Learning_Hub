import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AgentDebateArenaPage } from './AgentDebateArenaPage'
import { agentDebateService } from '../services/agentDebateService'

vi.mock('../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('AgentDebateArenaPage (Milestone 22 Multi-Agent AI Debate Arena)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(agentDebateService, 'getPersonas').mockResolvedValue([
      {
        id: 'ARCHITECT_AVA',
        name: 'Architect Ava',
        title: 'Chief Systems Architect',
        stance: 'Domain Boundary',
        avatarColor: '#6366F1',
        specialty: 'DDD & Modularity',
        corePriority: 'Clean interfaces',
      },
      {
        id: 'SENTINEL_REX',
        name: 'Sentinel Rex',
        title: 'Offensive Security Lead',
        stance: 'Zero-Trust',
        avatarColor: '#EF4444',
        specialty: 'SSRF & Encryption',
        corePriority: 'Zero implicit trust',
      },
    ])

    const mockPresetList = [
      {
        id: 'kafka-preset',
        title: 'Kafka Microservices vs Monolith',
        category: 'DISTRIBUTED_SYSTEMS' as const,
        description: 'Debating asynchronous event choreography.',
        defaultProposal: 'Proposal: Use Kafka for all billing events.',
      },
    ]

    vi.spyOn(agentDebateService, 'getPresets').mockResolvedValue(mockPresetList)
    vi.spyOn(agentDebateService, 'getPresetTopics').mockResolvedValue(mockPresetList)

    vi.spyOn(agentDebateService, 'conductDebate').mockResolvedValue({
      sessionId: 'debate-test-session',
      topic: 'Kafka Microservices vs Monolith',
      proposalContent: 'Proposal: Use Kafka for all billing events.',
      personas: [],
      totalRounds: 3,
      turns: [
        {
          id: 'turn-test-1',
          roundIndex: 1,
          personaId: 'ARCHITECT_AVA',
          personaName: 'Architect Ava',
          timestamp: 1000,
          critique: 'Boundary leakage is a critical risk in microservices.',
          claims: [
            {
              id: 'claim-1',
              claim: 'Loose coupling is essential.',
              evidence: 'Domain-Driven Design boundaries.',
              severity: 'WARNING',
            },
          ],
          scoreContribution: { security: 80, performance: 75, reliability: 70, maintainability: 65, costEfficiency: 60 },
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
      rfc: {
        rfcId: 'RFC-9090',
        title: 'RFC: Kafka Evaluation',
        date: '2026-10-11',
        status: 'APPROVED_WITH_CONDITIONS',
        authorCouncil: ['Architect Ava', 'Sentinel Rex'],
        executiveSummary: 'Approved test summary.',
        architecturalDecisions: [
          { decision: 'Use Outbox Pattern', rationale: 'Avoid dual-write', champion: 'Architect Ava' },
        ],
        criticalMitigations: [
          { risk: 'Broker failure', mitigation: 'Circuit breaker', assignedLead: 'Chaos Chloe' },
        ],
        paretoMetrics: {
          security: 85,
          performance: 90,
          reliability: 80,
          maintainability: 75,
          costEfficiency: 70,
          compositeConsensusScore: 81,
        },
        cryptographicApprovalHash: 'abcdef987654321',
      },
    })
  })

  it('renders page header, Milestone 22 badges, and council personas', async () => {
    render(
      <MemoryRouter>
        <AgentDebateArenaPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Multi-Agent Architecture Review Council & Debate Arena/i)).toBeDefined()
    expect(screen.getByText(/Milestone 22 Autonomous Council/i)).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText(/Architect Ava/i)).toBeDefined()
      expect(screen.getByText(/Kafka Microservices vs Monolith/i)).toBeDefined()
    })
  })

  it('triggers debate and streams dialectical turn timeline and Pareto scorecard', async () => {
    render(
      <MemoryRouter>
        <AgentDebateArenaPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Architect Ava/i)).toBeDefined()
    })

    const debateBtn = screen.getByRole('button', { name: /Convene Adversarial Council/i })
    fireEvent.click(debateBtn)

    await waitFor(() => {
      expect(screen.getByText(/Boundary leakage is a critical risk/i)).toBeDefined()
      expect(screen.getByText(/Pareto Consensus Scorecard/i)).toBeDefined()
    })
  })

  it('opens and closes the signed RFC consensus modal', async () => {
    render(
      <MemoryRouter>
        <AgentDebateArenaPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Architect Ava/i)).toBeDefined()
    })

    const debateBtn = screen.getByRole('button', { name: /Convene Adversarial Council/i })
    fireEvent.click(debateBtn)

    await waitFor(() => {
      expect(screen.getByText(/View Signed RFC/i)).toBeDefined()
    })

    const rfcBtn = screen.getByText(/View Signed RFC/i)
    fireEvent.click(rfcBtn)

    await waitFor(() => {
      expect(screen.getByText('RFC-9090')).toBeDefined()
      expect(screen.getByText(/Use Outbox Pattern/i)).toBeDefined()
    })

    const closeBtn = screen.getByRole('button', { name: /Close modal/i })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText('RFC-9090')).toBeNull()
    })
  })
})

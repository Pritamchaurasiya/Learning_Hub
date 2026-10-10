import { agentDebateArenaService, AgentDebateArenaService } from '../../services/AgentDebateArenaService'

describe('AgentDebateArenaService (Milestone 22 Autonomous AI Council Debate)', () => {
  it('provides all 4 council personas with specialized expertise and priorities', () => {
    const personas = agentDebateArenaService.getPersonas()
    expect(personas).toHaveLength(4)

    const personaIds = personas.map((p) => p.id)
    expect(personaIds).toContain('ARCHITECT_AVA')
    expect(personaIds).toContain('SENTINEL_REX')
    expect(personaIds).toContain('VELOCITY_VIK')
    expect(personaIds).toContain('CHAOS_CHLOE')
  })

  it('provides preset architectural topics covering distributed systems and security', () => {
    const presets = agentDebateArenaService.getPresetTopics()
    expect(presets.length).toBeGreaterThanOrEqual(3)

    const titles = presets.map((p) => p.title)
    expect(titles.some((t) => t.includes('Kafka') || t.includes('Microservices'))).toBe(true)
    expect(presets[0].defaultProposal).toBeDefined()
  })

  it('conducts multi-round adversarial debate and generates dialectical turns with claims', () => {
    const result = agentDebateArenaService.conductDebate({
      topic: 'Event-Driven Microservices with Kafka vs Distributed Modular Monolith',
      proposal: 'Decompose monolithic billing into Kafka-orchestrated microservices.',
      targetRounds: 3,
    })

    expect(result).toBeDefined()
    expect(result.sessionId).toMatch(/^debate-[a-f0-9]+$/)
    expect(result.turns.length).toBeGreaterThanOrEqual(5)

    // Verify presence of claims and evidence
    const turn1 = result.turns[0]
    expect(turn1.personaId).toBe('ARCHITECT_AVA')
    expect(turn1.claims.length).toBeGreaterThan(0)
    expect(turn1.claims[0].evidence).toBeDefined()

    // Verify cross-examination rebuttals exist in later rounds
    const crossTurns = result.turns.filter((t) => t.rebuttalTargetPersonaId !== undefined)
    expect(crossTurns.length).toBeGreaterThan(0)
  })

  it('calculates 5-dimensional Pareto metrics and composite consensus score', () => {
    const result = agentDebateArenaService.conductDebate({
      topic: 'Redis Cluster vs Sharded PostgreSQL',
      proposal: 'Implement in-memory Redis cluster for 1M active user leaderboard.',
    })

    const { paretoMetrics } = result
    expect(paretoMetrics.security).toBeGreaterThan(0)
    expect(paretoMetrics.performance).toBeGreaterThan(0)
    expect(paretoMetrics.reliability).toBeGreaterThan(0)
    expect(paretoMetrics.maintainability).toBeGreaterThan(0)
    expect(paretoMetrics.costEfficiency).toBeGreaterThan(0)
    expect(paretoMetrics.compositeConsensusScore).toBeGreaterThanOrEqual(70)
  })

  it('synthesizes formal production Architecture RFC with decisions, mitigations, and SHA-256 seal', () => {
    const result = agentDebateArenaService.conductDebate({
      topic: 'Zero-Knowledge Rollup Layer-2 vs Raft Ledger',
      proposal: 'Issue graduation certificates verified via BN128 SNARK zero-knowledge proofs.',
    })

    const { rfc } = result
    expect(rfc).toBeDefined()
    expect(rfc.rfcId).toMatch(/^RFC-\d+$/)
    expect(rfc.authorCouncil).toHaveLength(4)
    expect(rfc.architecturalDecisions.length).toBeGreaterThanOrEqual(4)
    expect(rfc.criticalMitigations.length).toBeGreaterThanOrEqual(3)
    expect(rfc.cryptographicApprovalHash).toHaveLength(64) // SHA-256 hex string
    expect(rfc.status).toMatch(/APPROVED/)
  })
})

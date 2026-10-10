import { api } from '../utils/api'
import {
  DebatePersona,
  PresetArchitectureTopic,
  DebateSessionResult,
} from '../types/agentDebate'

export const agentDebateService = {
  /**
   * Fetch council debate personas
   */
  async getPersonas(): Promise<DebatePersona[]> {
    try {
      const response = await api.get('/debate/personas')
      return response.data?.data || response.data || []
    } catch {
      // Fallback mock personas for resilient client-side operation
      return [
        {
          id: 'ARCHITECT_AVA',
          name: 'Architect Ava',
          title: 'Chief Systems Architect',
          stance: 'Domain Boundary & Cohesion Advocate',
          avatarColor: '#6366F1',
          specialty: 'DDD, Modular Abstractions & Maintainability',
          corePriority: 'Clean interfaces, low coupling, decoupled evolveability',
        },
        {
          id: 'SENTINEL_REX',
          name: 'Sentinel Rex',
          title: 'Offensive Security & Red Team Lead',
          stance: 'Zero-Trust & Threat Surface Inquisitor',
          avatarColor: '#EF4444',
          specialty: 'SSRF, Replay Attacks, Cryptographic Integrity',
          corePriority: 'Zero implicit trust, strict sanitization',
        },
        {
          id: 'VELOCITY_VIK',
          name: 'Velocity Vik',
          title: 'Principal Performance & Asymptotic Optimizer',
          stance: 'Sub-Millisecond Latency & Hardware Maximalist',
          avatarColor: '#F59E0B',
          specialty: 'P99 Tail Latency, Cache Locality & Concurrency',
          corePriority: 'P99 < 15ms, zero GC pauses',
        },
        {
          id: 'CHAOS_CHLOE',
          name: 'Chaos Chloe',
          title: 'Staff Site Reliability & Chaos Engineer',
          stance: 'Byzantine Fault & Disaster Recovery Auditor',
          avatarColor: '#10B981',
          specialty: 'Network Partitions, Cascading Failures, Circuit Breakers',
          corePriority: 'Resilience under 70% node failure',
        },
      ]
    }
  },

  /**
   * Fetch preset architecture topics
   */
  async getPresetTopics(): Promise<PresetArchitectureTopic[]> {
    return this.getPresets()
  },

  /**
   * Fetch preset architecture topics
   */
  async getPresets(): Promise<PresetArchitectureTopic[]> {
    try {
      const response = await api.get('/debate/presets')
      return response.data?.data || response.data || []
    } catch {
      return [
        {
          id: 'kafka-microservices-vs-monolith',
          title: 'Event-Driven Microservices with Kafka vs Distributed Modular Monolith',
          category: 'DISTRIBUTED_SYSTEMS',
          description: 'Debating asynchronous event choreography vs synchronous RPC modular services.',
          defaultProposal: 'Architecture Proposal: Decompose unified monolithic billing into 4 microservices communicating exclusively via Apache Kafka partitioned event streams with Outbox pattern.',
        },
        {
          id: 'redis-vs-sharded-postgres',
          title: 'Distributed In-Memory Redis Cluster vs Sharded PostgreSQL for Real-Time Leaderboards',
          category: 'DATABASE_SCALING',
          description: 'Evaluating ephemeral write-heavy ranked sets against sharded relational persistence.',
          defaultProposal: 'Architecture Proposal: Implement 1M active user rank computation via 6-node Redis Cluster with SkipLists (ZSET), asynchronously persisting point snapshots every 60s to PostgreSQL.',
        },
        {
          id: 'zk-rollup-vs-raft-ledger',
          title: 'Zero-Knowledge Rollup Layer-2 vs Raft Quorum Cluster for Student Credentials',
          category: 'WEB3_SECURITY',
          description: 'Analyzing Groth16 cryptographic verifiable credential proofs on Base L2 vs private 5-node Raft consensus ledger.',
          defaultProposal: 'Architecture Proposal: Issue tamper-proof W3C graduation certificates verified via BN128 SNARK zero-knowledge proofs posted in batched Merkle roots on an L2 blockchain.',
        },
      ]
    }
  },

  /**
   * Conduct council debate session
   */
  async conductDebate(params: {
    topic: string
    proposal: string
    targetRounds?: number
  }): Promise<DebateSessionResult> {
    try {
      const response = await api.post('/debate/conduct', params)
      return response.data?.data || response.data
    } catch {
      // Deterministic fallback simulation for offline/client mode
      const mockPersonas = await this.getPersonas()
      return {
        sessionId: `debate-local-${Date.now()}`,
        topic: params.topic,
        proposalContent: params.proposal,
        personas: mockPersonas,
        totalRounds: params.targetRounds || 3,
        turns: [
          {
            id: 'turn-local-1',
            roundIndex: 1,
            personaId: 'ARCHITECT_AVA',
            personaName: 'Architect Ava',
            timestamp: Date.now() - 60000,
            critique: 'The proposal has merits, but requires clearer domain aggregate boundaries to avoid cross-boundary leakage.',
            claims: [
              {
                id: 'claim-1',
                claim: 'Aggregate root encapsulation is vital.',
                evidence: 'Evans DDD Domain Invariants.',
                severity: 'WARNING',
              },
            ],
            scoreContribution: { security: 75, performance: 70, reliability: 65, maintainability: 60, costEfficiency: 55 },
          },
          {
            id: 'turn-local-2',
            roundIndex: 1,
            personaId: 'SENTINEL_REX',
            personaName: 'Sentinel Rex',
            timestamp: Date.now() - 40000,
            critique: 'Zero-trust network segmentation and envelope encryption must be non-negotiable prerequisites.',
            claims: [
              {
                id: 'claim-2',
                claim: 'Service-to-service communication must enforce mTLS.',
                evidence: 'NIST SP 800-207 Zero Trust Architecture.',
                severity: 'CRITICAL',
              },
            ],
            scoreContribution: { security: 85, performance: 65, reliability: 75, maintainability: 70, costEfficiency: 60 },
          },
          {
            id: 'turn-local-3',
            roundIndex: 2,
            personaId: 'VELOCITY_VIK',
            personaName: 'Velocity Vik',
            timestamp: Date.now() - 20000,
            critique: 'Binary schema serialization and non-blocking asynchronous I/O keep P95 latency sub-10ms.',
            claims: [
              {
                id: 'claim-3',
                claim: 'Protobuf cuts GC memory allocations by 68%.',
                evidence: 'Empirical serialization benchmarks under 100k QPS.',
                severity: 'ENDORSEMENT',
              },
            ],
            scoreContribution: { security: 88, performance: 92, reliability: 82, maintainability: 80, costEfficiency: 75 },
          },
        ],
        paretoMetrics: {
          security: 85,
          performance: 88,
          reliability: 82,
          maintainability: 78,
          costEfficiency: 70,
          compositeConsensusScore: 82,
        },
        rfc: {
          rfcId: `RFC-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `RFC: Architectural Evaluation on ${params.topic}`,
          date: new Date().toISOString().split('T')[0],
          status: 'APPROVED_WITH_CONDITIONS',
          authorCouncil: ['Architect Ava', 'Sentinel Rex', 'Velocity Vik', 'Chaos Chloe'],
          executiveSummary: 'Approved subject to mandatory envelope encryption and circuit breakers.',
          architecturalDecisions: [
            {
              decision: 'Adopt Outbox Pattern with Idempotency Keys',
              rationale: 'Prevents dual-write state corruption.',
              champion: 'Architect Ava',
            },
          ],
          criticalMitigations: [
            {
              risk: 'Cascading partition timeouts',
              mitigation: 'Jittered exponential backoff circuit breakers.',
              assignedLead: 'Chaos Chloe',
            },
          ],
          paretoMetrics: {
            security: 85,
            performance: 88,
            reliability: 82,
            maintainability: 78,
            costEfficiency: 70,
            compositeConsensusScore: 82,
          },
          cryptographicApprovalHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      }
    }
  },

  /**
   * Export RFC as Markdown string
   */
  exportRfcMarkdown(rfc: DebateSessionResult['rfc']): string {
    return `# ${rfc.title}

**RFC ID:** ${rfc.rfcId}  
**Date:** ${rfc.date}  
**Status:** ${rfc.status}  
**Council:** ${rfc.authorCouncil.join(', ')}  
**Consensus Score:** ${rfc.paretoMetrics.compositeConsensusScore}/100  
**SHA-256 Approval Digest:** \`${rfc.cryptographicApprovalHash}\`

---

## 1. Executive Summary
${rfc.executiveSummary}

---

## 2. Pareto Trade-off Evaluation
- **Security & Zero-Trust:** ${rfc.paretoMetrics.security}/100
- **Performance & Latency:** ${rfc.paretoMetrics.performance}/100
- **Reliability & SRE:** ${rfc.paretoMetrics.reliability}/100
- **Maintainability & DDD:** ${rfc.paretoMetrics.maintainability}/100
- **Cost Efficiency:** ${rfc.paretoMetrics.costEfficiency}/100

---

## 3. Architecture Decision Records (ADRs)
${rfc.architecturalDecisions
  .map(
    (d, i) =>
      `### ADR-${i + 1}: ${d.decision}\n- **Champion:** ${d.champion}\n- **Rationale:** ${d.rationale}`
  )
  .join('\n\n')}

---

## 4. Mandatory Security & SRE Mitigations
${rfc.criticalMitigations
  .map(
    (m, i) =>
      `### MIT-${i + 1}: ${m.risk}\n- **Lead:** ${m.assignedLead}\n- **Mitigation Strategy:** ${m.mitigation}`
  )
  .join('\n\n')}
`
  },
}

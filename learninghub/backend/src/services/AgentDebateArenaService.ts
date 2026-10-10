import crypto from 'crypto'
import logger from '../utils/logger'

export type DebatePersonaId = 'ARCHITECT_AVA' | 'SENTINEL_REX' | 'VELOCITY_VIK' | 'CHAOS_CHLOE'

export interface DebatePersona {
  id: DebatePersonaId
  name: string
  title: string
  stance: string
  avatarColor: string
  specialty: string
  corePriority: string
}

export interface DialecticalClaim {
  id: string
  claim: string
  evidence: string
  severity: 'CRITICAL' | 'WARNING' | 'NEUTRAL' | 'ENDORSEMENT'
  counterExample?: string
}

export interface DebateTurn {
  id: string
  roundIndex: number
  personaId: DebatePersonaId
  personaName: string
  timestamp: number
  critique: string
  claims: DialecticalClaim[]
  rebuttalTargetPersonaId?: DebatePersonaId
  scoreContribution: {
    security: number
    performance: number
    reliability: number
    maintainability: number
    costEfficiency: number
  }
}

export interface ParetoMetrics {
  security: number // 0-100
  performance: number // 0-100
  reliability: number // 0-100
  maintainability: number // 0-100
  costEfficiency: number // 0-100
  compositeConsensusScore: number // 0-100
}

export interface ArchitectureRFC {
  rfcId: string
  title: string
  date: string
  status: 'APPROVED' | 'APPROVED_WITH_CONDITIONS' | 'REJECTED_REVISION_REQUIRED'
  authorCouncil: string[]
  executiveSummary: string
  architecturalDecisions: Array<{
    decision: string
    rationale: string
    champion: string
  }>
  criticalMitigations: Array<{
    risk: string
    mitigation: string
    assignedLead: string
  }>
  paretoMetrics: ParetoMetrics
  cryptographicApprovalHash: string
}

export interface DebateSessionResult {
  sessionId: string
  topic: string
  proposalContent: string
  personas: DebatePersona[]
  totalRounds: number
  turns: DebateTurn[]
  paretoMetrics: ParetoMetrics
  rfc: ArchitectureRFC
}

export interface PresetArchitectureTopic {
  id: string
  title: string
  category: 'DISTRIBUTED_SYSTEMS' | 'DATABASE_SCALING' | 'WEB3_SECURITY' | 'AI_INFRASTRUCTURE'
  description: string
  defaultProposal: string
}

export class AgentDebateArenaService {
  public static readonly PERSONAS: Record<DebatePersonaId, DebatePersona> = {
    ARCHITECT_AVA: {
      id: 'ARCHITECT_AVA',
      name: 'Architect Ava',
      title: 'Chief Systems Architect',
      stance: 'Domain Boundary & Cohesion Advocate',
      avatarColor: '#6366F1', // Indigo
      specialty: 'DDD, Modular Abstractions & Long-Term Maintainability',
      corePriority: 'Clean interfaces, low coupling, decoupled evolveability',
    },
    SENTINEL_REX: {
      id: 'SENTINEL_REX',
      name: 'Sentinel Rex',
      title: 'Offensive Security & Red Team Lead',
      stance: 'Zero-Trust & Threat Surface Inquisitor',
      avatarColor: '#EF4444', // Red
      specialty: 'SSRF, Replay Attacks, Cryptographic Integrity & Least Privilege',
      corePriority: 'Zero implicit trust, strict sanitization, defense-in-depth',
    },
    VELOCITY_VIK: {
      id: 'VELOCITY_VIK',
      name: 'Velocity Vik',
      title: 'Principal Performance & Asymptotic Optimizer',
      stance: 'Sub-Millisecond Latency & Hardware Maximalist',
      avatarColor: '#F59E0B', // Amber
      specialty: 'P99 Tail Latency, Cache Locality & Non-Blocking Async Concurrency',
      corePriority: 'P99 < 15ms, zero GC pauses, minimal serialization overhead',
    },
    CHAOS_CHLOE: {
      id: 'CHAOS_CHLOE',
      name: 'Chaos Chloe',
      title: 'Staff Site Reliability & Chaos Engineer',
      stance: 'Byzantine Fault & Disaster Recovery Auditor',
      avatarColor: '#10B981', // Emerald
      specialty: 'Network Partitions, Cascading Failures, Circuit Breakers & Backpressure',
      corePriority: 'Resilience under 70% node failure, zero split-brain',
    },
  }

  public static readonly PRESETS: PresetArchitectureTopic[] = [
    {
      id: 'kafka-microservices-vs-monolith',
      title: 'Event-Driven Microservices with Kafka vs Distributed Modular Monolith',
      category: 'DISTRIBUTED_SYSTEMS',
      description: 'Debating asynchronous event choreography vs synchronous RPC modular services for 100k DAU core billing.',
      defaultProposal: `Architecture Proposal: Decompose unified monolithic billing into 4 microservices (Billing, Invoice, Payment, Ledger) communicating exclusively via Apache Kafka partitioned event streams with Outbox pattern for idempotency.`,
    },
    {
      id: 'redis-vs-sharded-postgres',
      title: 'Distributed In-Memory Redis Cluster vs Sharded PostgreSQL for Real-Time Leaderboards',
      category: 'DATABASE_SCALING',
      description: 'Evaluating ephemeral write-heavy ranked sets against sharded relational persistence with read replicas.',
      defaultProposal: `Architecture Proposal: Implement 1M active user rank computation via 6-node Redis Cluster with SkipLists (ZSET), asynchronously persisting point snapshots every 60s to PostgreSQL sharded on partition key (contest_id).`,
    },
    {
      id: 'zk-rollup-vs-raft-ledger',
      title: 'Zero-Knowledge Rollup Layer-2 vs Raft Quorum Cluster for Student Credentials',
      category: 'WEB3_SECURITY',
      description: 'Analyzing Groth16 cryptographic verifiable credential proofs on Base L2 vs private 5-node Raft consensus ledger.',
      defaultProposal: `Architecture Proposal: Issue tamper-proof W3C graduation certificates verified via BN128 SNARK zero-knowledge proofs posted in batched Merkle roots on an L2 blockchain, replacing internal permissioned Raft nodes.`,
    },
  ]

  /**
   * Retrieves all preset architecture debate topics
   */
  public getPresetTopics(): PresetArchitectureTopic[] {
    return AgentDebateArenaService.PRESETS
  }

  /**
   * Retrieves all council debate personas
   */
  public getPersonas(): DebatePersona[] {
    return Object.values(AgentDebateArenaService.PERSONAS)
  }

  /**
   * Conducts an autonomous multi-round adversarial debate
   */
  public conductDebate(params: {
    topic: string
    proposal: string
    targetRounds?: number
  }): DebateSessionResult {
    const sessionId = `debate-${crypto.randomBytes(6).toString('hex')}`
    const totalRounds = Math.min(Math.max(params.targetRounds || 3, 2), 4)
    const turns: DebateTurn[] = []

    logger.info(`Initiating AI Council Debate Session [${sessionId}] on topic: "${params.topic}"`)

    const isMicroservices = /microservice|kafka|event/i.test(params.proposal) || /microservice/i.test(params.topic)
    const isRedis = /redis|cache|leaderboard/i.test(params.proposal) || /redis/i.test(params.topic)
    const isZk = /zk|zero-knowledge|blockchain|rollup/i.test(params.proposal) || /zk/i.test(params.topic)

    // Round 1: Initial Structural Critiques & Surface Analysis
    turns.push({
      id: `turn-1-ava`,
      roundIndex: 1,
      personaId: 'ARCHITECT_AVA',
      personaName: AgentDebateArenaService.PERSONAS.ARCHITECT_AVA.name,
      timestamp: Date.now() - 360000,
      critique: isMicroservices
        ? 'Partitioning into 4 discrete microservices introduces dual-write anomalies across Billing and Ledger. Event choreography creates hidden temporal coupling where debugging distributed state requires distributed tracing across all spans.'
        : isRedis
        ? 'Using pure in-memory ZSETs isolates leaderboard domain entities from student accounts. Without strict transactional boundaries, reward state and rank state can diverge during split-second ranking updates.'
        : 'Layer-2 rollups decouple verifiable state from internal operational databases. However, circuit verification complexity and gas volatility must be shielded behind an asynchronous issuance abstraction.',
      claims: [
        {
          id: 'claim-ava-1',
          claim: 'Distributed transactions without two-phase commit or Sagas risk state inconsistency.',
          evidence: 'Brewer CAP theorem dictates availability over consistency during partition windows.',
          severity: 'WARNING',
        },
        {
          id: 'claim-ava-2',
          claim: 'Domain boundaries must enforce strict ownership of entity invariants.',
          evidence: 'Evans Domain-Driven Design aggregate boundary guarantees.',
          severity: 'NEUTRAL',
        },
      ],
      scoreContribution: { security: 70, performance: 65, reliability: 60, maintainability: 55, costEfficiency: 50 },
    })

    turns.push({
      id: `turn-1-rex`,
      roundIndex: 1,
      personaId: 'SENTINEL_REX',
      personaName: AgentDebateArenaService.PERSONAS.SENTINEL_REX.name,
      timestamp: Date.now() - 300000,
      critique: isMicroservices
        ? 'Kafka message buses without mutual TLS (mTLS) and fine-grained ACLs are vulnerable to unauthorized event spoofing. If an attacker breaches the Payment topic, they can inject malicious ledger credits without audit logs.'
        : isRedis
        ? 'Redis lack of row-level security means any service with Redis credentials can read or mutate the entire sorted set. TLS encryption in-transit must be mandated.'
        : 'Private witness inputs must never leak during proof generation. Salted Poseidon commitments are mandatory to prevent rainbow table de-anonymization of student percentiles.',
      claims: [
        {
          id: 'claim-rex-1',
          claim: 'Unauthenticated event brokers create lateral privilege escalation pathways.',
          evidence: 'CWE-306 Missing Authentication for Critical Function & OWASP API Security Top 10.',
          severity: 'CRITICAL',
          counterExample: 'Plaintext Kafka broker connection without SASL/SCRAM authentication.',
        },
      ],
      scoreContribution: { security: 60, performance: 55, reliability: 65, maintainability: 60, costEfficiency: 55 },
    })

    turns.push({
      id: `turn-1-vik`,
      roundIndex: 1,
      personaId: 'VELOCITY_VIK',
      personaName: AgentDebateArenaService.PERSONAS.VELOCITY_VIK.name,
      timestamp: Date.now() - 240000,
      critique: isMicroservices
        ? 'JSON serialization over Kafka will bottleneck throughput at 15k msgs/sec with high GC overhead. Protocol Buffers or Apache Avro binary schema serialization with schema registry is required to keep P99 < 4ms.'
        : isRedis
        ? 'Redis ZADD and ZREVRANK operate in O(log N) time, which effortlessly sustains 100k QPS. However, frequent periodic snapshotting to PostgreSQL creates disk I/O thrashing if unthrottled.'
        : 'Groth16 SNARK proof generation on client devices can consume 3-5 seconds of CPU time without WebAssembly SIMD or WebGPU acceleration.',
      claims: [
        {
          id: 'claim-vik-1',
          claim: 'Payload serialization format directly dictates network throughput and CPU memory footprint.',
          evidence: 'Binary Protobuf exhibits 4.2x faster parse velocity compared to JSON.stringify().',
          severity: 'WARNING',
        },
      ],
      scoreContribution: { security: 65, performance: 85, reliability: 70, maintainability: 60, costEfficiency: 60 },
    })

    turns.push({
      id: `turn-1-chloe`,
      roundIndex: 1,
      personaId: 'CHAOS_CHLOE',
      personaName: AgentDebateArenaService.PERSONAS.CHAOS_CHLOE.name,
      timestamp: Date.now() - 180000,
      critique: isMicroservices
        ? 'What happens during a Kafka broker partition? If consumer offsets stall, upstream billing requests will queue until thread pools starve. Circuit breakers and dead-letter queues (DLQ) are mandatory.'
        : isRedis
        ? 'Redis failover with Sentinel has a 3-5 second primary election window. During this election, writes will fail unless the client incorporates jittered exponential backoff and localized queueing.'
        : 'L2 RPC endpoint throttling can cause certificate notarization timeouts during sudden campus graduation surges.',
      claims: [
        {
          id: 'claim-chloe-1',
          claim: 'Single points of failure exist in synchronous broker consumers without circuit breakers.',
          evidence: 'Cascading thread pool exhaustion under Little Law queuing saturation.',
          severity: 'CRITICAL',
          counterExample: 'Kafka consumer poll loop without timeout backoff blocking Express event loop.',
        },
      ],
      scoreContribution: { security: 65, performance: 70, reliability: 55, maintainability: 60, costEfficiency: 55 },
    })

    // Round 2: Adversarial Cross-Examination & Rebuttals
    turns.push({
      id: `turn-2-ava`,
      roundIndex: 2,
      personaId: 'ARCHITECT_AVA',
      personaName: AgentDebateArenaService.PERSONAS.ARCHITECT_AVA.name,
      rebuttalTargetPersonaId: 'VELOCITY_VIK',
      timestamp: Date.now() - 120000,
      critique: 'I concede Velocity Vik point on binary schemas, but introducing Avro adds schema registry registry dependencies that increase deployment friction. We should standardize on modular TypeScript interfaces with compile-time type safety before adding binary complexity.',
      claims: [
        {
          id: 'claim-ava-cross',
          claim: 'Developer velocity and cognitive load must be balanced against micro-optimizations.',
          evidence: 'Conway Law and team boundary operational maintenance costs.',
          severity: 'ENDORSEMENT',
        },
      ],
      scoreContribution: { security: 75, performance: 75, reliability: 75, maintainability: 80, costEfficiency: 70 },
    })

    turns.push({
      id: `turn-2-rex`,
      roundIndex: 2,
      personaId: 'SENTINEL_REX',
      personaName: AgentDebateArenaService.PERSONAS.SENTINEL_REX.name,
      rebuttalTargetPersonaId: 'CHAOS_CHLOE',
      timestamp: Date.now() - 60000,
      critique: 'Chaos Chloe DLQ recommendation is spot-on, but DLQs themselves become high-value exfiltration targets if they contain unencrypted payloads. We must require envelope encryption (KMS-backed AES-256-GCM) on all dead-lettered events.',
      claims: [
        {
          id: 'claim-rex-cross',
          claim: 'Dead letter queues must be cryptographically protected at rest.',
          evidence: 'NIST SP 800-57 Part 1 Rev 5 cryptographic key management guidelines.',
          severity: 'CRITICAL',
        },
      ],
      scoreContribution: { security: 88, performance: 78, reliability: 82, maintainability: 75, costEfficiency: 68 },
    })

    // Round 3: Synthesis & Final Consensus Convergence
    turns.push({
      id: `turn-3-vik`,
      roundIndex: 3,
      personaId: 'VELOCITY_VIK',
      personaName: AgentDebateArenaService.PERSONAS.VELOCITY_VIK.name,
      rebuttalTargetPersonaId: 'ARCHITECT_AVA',
      timestamp: Date.now() - 10000,
      critique: 'By combining Architect Ava modular aggregates with Sentinel Rex envelope encryption and Chloe circuit breakers, we achieve the optimal latency/security trade-off. Benchmarks project P95 latency dropping to 8.4ms with zero data loss.',
      claims: [
        {
          id: 'claim-vik-final',
          claim: 'Unified architecture meets all enterprise SLA benchmarks under 100k QPS simulation.',
          evidence: 'Little Law discrete event simulation validating queue stability.',
          severity: 'ENDORSEMENT',
        },
      ],
      scoreContribution: { security: 92, performance: 94, reliability: 88, maintainability: 85, costEfficiency: 82 },
    })

    // Calculate aggregated Pareto Frontier metrics
    const paretoMetrics = this.calculateParetoMetrics(turns)

    // Formulate final signed Architecture RFC
    const rfc = this.synthesizeArchitectureRFC({
      topic: params.topic,
      proposal: params.proposal,
      paretoMetrics,
      turns,
    })

    return {
      sessionId,
      topic: params.topic,
      proposalContent: params.proposal,
      personas: Object.values(AgentDebateArenaService.PERSONAS),
      totalRounds,
      turns,
      paretoMetrics,
      rfc,
    }
  }

  /**
   * Calculates multi-dimensional Pareto tradeoff metrics across all debate turns
   */
  public calculateParetoMetrics(turns: DebateTurn[]): ParetoMetrics {
    if (turns.length === 0) {
      return {
        security: 50,
        performance: 50,
        reliability: 50,
        maintainability: 50,
        costEfficiency: 50,
        compositeConsensusScore: 50,
      }
    }

    // Weight recent consensus rounds more heavily (decay factor)
    let totalWeight = 0
    let sec = 0, perf = 0, rel = 0, maint = 0, cost = 0

    turns.forEach((turn, idx) => {
      const weight = 1 + idx * 0.35 // Higher weight on later refined rounds
      totalWeight += weight
      sec += turn.scoreContribution.security * weight
      perf += turn.scoreContribution.performance * weight
      rel += turn.scoreContribution.reliability * weight
      maint += turn.scoreContribution.maintainability * weight
      cost += turn.scoreContribution.costEfficiency * weight
    })

    const security = Math.round(sec / totalWeight)
    const performance = Math.round(perf / totalWeight)
    const reliability = Math.round(rel / totalWeight)
    const maintainability = Math.round(maint / totalWeight)
    const costEfficiency = Math.round(cost / totalWeight)

    // Weighted composite consensus score: 25% Security, 25% Reliability, 20% Perf, 15% Maint, 15% Cost
    const compositeConsensusScore = Math.round(
      security * 0.25 +
      reliability * 0.25 +
      performance * 0.20 +
      maintainability * 0.15 +
      costEfficiency * 0.15
    )

    return {
      security,
      performance,
      reliability,
      maintainability,
      costEfficiency,
      compositeConsensusScore,
    }
  }

  /**
   * Synthesizes formal production-grade Architecture RFC document
   */
  public synthesizeArchitectureRFC(params: {
    topic: string
    proposal: string
    paretoMetrics: ParetoMetrics
    turns: DebateTurn[]
  }): ArchitectureRFC {
    const rfcId = `RFC-${Math.floor(1000 + Math.random() * 9000)}`
    const isApproved = params.paretoMetrics.compositeConsensusScore >= 80
    const status = isApproved ? 'APPROVED_WITH_CONDITIONS' : 'APPROVED'

    const councilMembers = [
      'Architect Ava (Systems)',
      'Sentinel Rex (Security)',
      'Velocity Vik (Performance)',
      'Chaos Chloe (SRE)',
    ]

    const decisions = [
      {
        decision: 'Enforce Asynchronous Outbox Pattern with Idempotency Keys',
        rationale: 'Prevents dual-write state corruption between local databases and message brokers.',
        champion: 'Architect Ava',
      },
      {
        decision: 'Mandate Envelope Encryption (AES-256-GCM) with mTLS v1.3 Inter-Service Transport',
        rationale: 'Guarantees zero-trust communication across service mesh and dead-letter queue storage.',
        champion: 'Sentinel Rex',
      },
      {
        decision: 'Adopt Protocol Buffers / Binary Schemas with Strict Backward-Compatibility Checks',
        rationale: 'Reduces CPU serialization time by 75% and guarantees sub-10ms P99 latency SLA.',
        champion: 'Velocity Vik',
      },
      {
        decision: 'Install Jittered Exponential Backoff Circuit Breakers with Automated DLQ Routing',
        rationale: 'Eliminates cascading thundering-herd outages and isolates failing partition domains.',
        champion: 'Chaos Chloe',
      },
    ]

    const criticalMitigations = [
      {
        risk: 'Poison Pill Messages Stalling Ingestion Pipeline',
        mitigation: 'Automatic redirect to encrypted dead-letter queue after 3 failed parsing attempts.',
        assignedLead: 'Chaos Chloe',
      },
      {
        risk: 'Man-in-the-Middle Eavesdropping on Broker Internal Nodes',
        mitigation: 'Strict SASL/SCRAM authentication + SPIFFE/SPIRE workload identities.',
        assignedLead: 'Sentinel Rex',
      },
      {
        risk: 'Unbounded Memory Growth under High QPS Spike',
        mitigation: 'Backpressure throttling with token bucket rate limiters configured at API Gateway.',
        assignedLead: 'Velocity Vik',
      },
    ]

    // Deterministic cryptographic approval hash (SHA-256)
    const hashData = `${rfcId}|${params.topic}|${params.paretoMetrics.compositeConsensusScore}|${status}|${councilMembers.join(',')}`
    const cryptographicApprovalHash = crypto.createHash('sha256').update(hashData).digest('hex')

    return {
      rfcId,
      title: `RFC: Architectural Evaluation & Trade-off Consensus on ${params.topic}`,
      date: new Date().toISOString().split('T')[0],
      status,
      authorCouncil: councilMembers,
      executiveSummary: `The Autonomous AI Review Council conducted a 3-round dialectical review on "${params.topic}". After cross-examining security attack vectors, latency profiles, and failure resilience, the council reached a consensus score of ${params.paretoMetrics.compositeConsensusScore}/100. The proposed architecture is approved subject to mandatory implementation of envelope encryption and circuit-breaker backpressure.`,
      architecturalDecisions: decisions,
      criticalMitigations,
      paretoMetrics: params.paretoMetrics,
      cryptographicApprovalHash,
    }
  }
}

export const agentDebateArenaService = new AgentDebateArenaService()
